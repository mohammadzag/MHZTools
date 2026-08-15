from __future__ import print_function, absolute_import, division, unicode_literals
import sys
import json
import argparse
import pandas as pd
import numpy as np
import scipy.stats as stats
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
except Exception as e:
    plt = None

try:
    import seaborn as sns
except Exception as e:
    sns = None

def parse_args():
    parser = argparse.ArgumentParser(description="Python Data Analysis Engine")
    parser.add_argument("--cmd", required=True, help="Command to run: summary_stats, chi_square, clean_data, plot")
    parser.add_argument("--file", required=True, help="Path to JSON dataset file")
    parser.add_argument("--params", required=False, default="{}", help="JSON string containing params")
    return parser.parse_args()

import io

def load_data(file_path):
    try:
        with io.open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return pd.DataFrame(data)
    except Exception as e:
        print("Error loading file: {}".format(str(e)), file=sys.stderr)
        sys.exit(1)

def run_summary_stats(df):
    results = []
    for col in df.columns:
        # Check if column is numeric (at least 80% convertable to float and not empty)
        converted = pd.to_numeric(df[col], errors='coerce')
        valid_nums = converted.dropna()
        
        if len(valid_nums) > 0 and len(valid_nums) / len(df) >= 0.8:
            mean = valid_nums.mean()
            median = valid_nums.median()
            minimum = valid_nums.min()
            maximum = valid_nums.max()
            std_dev = valid_nums.std(ddof=1) if len(valid_nums) > 1 else 0.0
            val_range = maximum - minimum
            count = len(valid_nums)
            
            results.append({
                "variable": col,
                "mean": "{:.3f}".format(mean),
                "median": "{:.3f}".format(median),
                "min": "{:.3f}".format(minimum),
                "max": "{:.3f}".format(maximum),
                "stdDev": "{:.3f}".format(std_dev),
                "range": "{:.3f}".format(val_range),
                "count": count
            })
    return results

def _chi_square_pair(df, col_a, col_b):
    """Run chi-square test for a single pair of columns. Returns a result dict."""
    import math, itertools
    test_df = df[[col_a, col_b]].dropna().copy()
    test_df = test_df[(test_df[col_a].astype(str).str.strip() != "") & (test_df[col_b].astype(str).str.strip() != "")]
    if len(test_df) < 4:
        return {"colA": col_a, "colB": col_b, "error": "Not enough data"}

    binned_note = []
    for col in [col_a, col_b]:
        converted = pd.to_numeric(test_df[col], errors='coerce')
        if converted.notna().count() > 0 and converted.dropna().nunique() > 25:
            try:
                binned = pd.qcut(converted, q=4, duplicates='drop')
                test_df[col] = binned.astype(str)
                binned_note.append(col)
            except Exception:
                test_df[col] = test_df[col].astype(str)
        else:
            test_df[col] = test_df[col].astype(str)

    observed = pd.crosstab(test_df[col_a], test_df[col_b])
    try:
        chi2, p_val, dof, _ = stats.chi2_contingency(observed)
    except Exception as e:
        return {"colA": col_a, "colB": col_b, "error": str(e)}

    cols_list = [str(x) for x in observed.columns]
    matrix = [{"rowLabel": str(idx), "values": [str(x) for x in row.values]}
              for idx, row in observed.iterrows()]

    if math.isnan(chi2) or math.isinf(chi2):
        chi2_str = "NaN"
        p_val_str = "NaN"
        significant = False
        interpretation = "Could not compute (NaN)."
    else:
        chi2_str = "{:.4f}".format(chi2)
        p_val_str = "{:.4e}".format(p_val) if p_val < 0.001 else "{:.4f}".format(p_val)
        significant = bool(p_val < 0.05)
        if significant:
            interpretation = "'{}' and '{}' are SIGNIFICANTLY associated (p = {} < 0.05).".format(col_a, col_b, p_val_str)
        else:
            interpretation = "'{}' and '{}' show NO significant association (p = {} >= 0.05).".format(col_a, col_b, p_val_str)
        if binned_note:
            interpretation += " Note: {} auto-binned into quartiles.".format(", ".join(binned_note))

    return {
        "colA": col_a, "colB": col_b,
        "statistic": chi2_str, "dof": int(dof) if not math.isnan(dof) else 0,
        "pValue": p_val_str, "pValueRaw": float(p_val) if not (math.isnan(p_val) or math.isinf(p_val)) else 1.0,
        "significant": significant, "interpretation": interpretation,
        "headers": cols_list, "matrix": matrix
    }


def run_chi_square(df, params):
    import itertools
    cols = params.get("cols")          # New: list of column names
    col_a = params.get("colA")        # Legacy: single pair
    col_b = params.get("colB")

    # Build column list — support both multi-col and legacy two-col API
    if cols and isinstance(cols, list) and len(cols) >= 2:
        selected = [c for c in cols if c in df.columns]
    elif col_a and col_b:
        selected = [col_a, col_b]
    else:
        print("Missing columns for Chi-Square test.", file=sys.stderr)
        sys.exit(1)

    if len(selected) < 2:
        print("Need at least 2 valid columns for Chi-Square test.", file=sys.stderr)
        sys.exit(1)

    # Compute all pairwise combinations
    pairs = list(itertools.combinations(selected, 2))
    pair_results = [_chi_square_pair(df, a, b) for a, b in pairs]

    # Build a p-value heatmap matrix (NxN)
    n = len(selected)
    heatmap = []
    for i, col_i in enumerate(selected):
        row = []
        for j, col_j in enumerate(selected):
            if i == j:
                row.append({"value": "-", "pRaw": -1, "significant": None})
            else:
                pair = next((r for r in pair_results
                             if (r.get("colA") == col_i and r.get("colB") == col_j)
                             or (r.get("colA") == col_j and r.get("colB") == col_i)), None)
                if pair and "error" not in pair:
                    row.append({"value": pair["pValue"], "pRaw": pair["pValueRaw"], "significant": pair["significant"]})
                else:
                    row.append({"value": "err", "pRaw": 1.0, "significant": False})
        heatmap.append(row)

    return {
        "columns": selected,
        "pairs": pair_results,
        "heatmap": heatmap
    }



import re
import math

def sanitize_df_records(df):
    """Convert DataFrame to a list of dict records, replacing NaN/Inf with None so it's valid JSON."""
    clean_df = df.astype(object).where(pd.notnull(df), None)
    records = clean_df.to_dict(orient="records")
    for row in records:
        for k, v in list(row.items()):
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                row[k] = None
    return records

def run_clean_data(df, params):
    action = params.get("action")
    
    if action == "remove_duplicates":
        df = df.drop_duplicates()
        
    elif action == "remove_invalid":
        invalid_strings = {'', 'null', 'none', 'nan', 'n/a', 'undefined', '#n/a', '-', 'null'}
        valid_rows_mask = pd.Series(True, index=df.index)
        
        for col in df.columns:
            series = df[col]
            is_null = series.isna()
            is_invalid_str = series.astype(str).str.strip().str.lower().isin(invalid_strings)
            
            converted = pd.to_numeric(series, errors='coerce')
            valid_ratio = converted.dropna().count() / len(df) if len(df) > 0 else 0
            if valid_ratio >= 0.8:
                is_invalid_num = converted.isna()
                col_invalid = is_null | is_invalid_str | is_invalid_num
            else:
                col_invalid = is_null | is_invalid_str
                
            valid_rows_mask = valid_rows_mask & (~col_invalid)
            
        df = df[valid_rows_mask]
        
    elif action == "standardize_text":
        col = params.get("column")
        op = params.get("operation")
        if col in df.columns:
            invalid_strings = {'', 'null', 'none', 'nan', 'n/a', 'undefined'}
            def transform_val(x):
                if pd.isna(x):
                    return x
                val_str = str(x).strip()
                if val_str.lower() in invalid_strings:
                    return x
                cleaned = re.sub(r'\s+', ' ', val_str)
                if op == "trim":
                    return cleaned
                elif op == "lower":
                    return cleaned.lower()
                elif op == "upper":
                    return cleaned.upper()
                elif op == "title":
                    return cleaned.title()
                return cleaned
                
            df[col] = df[col].apply(transform_val)
            
    elif action == "fix_outliers":
        col = params.get("column")
        method = params.get("method")
        remedy = params.get("remedy")
        
        if col in df.columns:
            converted = pd.to_numeric(df[col], errors='coerce')
            non_nans = converted.dropna().values
            
            if len(non_nans) > 0:
                if method == "iqr":
                    q1 = np.percentile(non_nans, 25)
                    q3 = np.percentile(non_nans, 75)
                    iqr = q3 - q1
                    lower = q1 - 1.5 * iqr
                    upper = q3 + 1.5 * iqr
                else:
                    mean = np.mean(non_nans)
                    std = np.std(non_nans, ddof=1) if len(non_nans) > 1 else 1.0
                    lower = mean - 3 * std
                    upper = mean + 3 * std
                    
                outliers_mask = converted.notna() & ((converted < lower) | (converted > upper))
                
                if remedy == "delete":
                    df = df[~outliers_mask]
                else:
                    if remedy == "mean":
                        fill_val = float(np.mean(non_nans))
                    elif remedy == "median":
                        fill_val = float(np.median(non_nans))
                    else:
                        fill_val = None
                        
                    for idx in df.index:
                        val = converted.loc[idx]
                        if pd.notna(val) and (val < lower or val > upper):
                            if remedy == "clip":
                                clipped = lower if val < lower else upper
                                df.at[idx, col] = round(float(clipped), 3)
                            else:
                                df.at[idx, col] = round(float(fill_val), 3)
                                
    return sanitize_df_records(df)





def _apply_light_theme():
    """Force all popup windows to always use a clean Seaborn whitegrid theme."""
    plt.style.use('default')
    if sns is not None:
        sns.set_theme(style="whitegrid", palette="deep")
    plt.rcParams['figure.facecolor'] = '#ffffff'
    plt.rcParams['axes.facecolor'] = '#ffffff'
    plt.rcParams['axes.edgecolor'] = '#b0b0b0'
    plt.rcParams['grid.color'] = '#e0e0e0'
    plt.rcParams['grid.linestyle'] = '-'
    plt.rcParams['grid.alpha'] = 0.8
    plt.rcParams['text.color'] = '#212529'
    plt.rcParams['axes.labelcolor'] = '#212529'
    plt.rcParams['xtick.color'] = '#495057'
    plt.rcParams['ytick.color'] = '#495057'
    plt.rcParams['axes.titlecolor'] = '#212529'
    plt.rcParams['legend.facecolor'] = '#ffffff'
    plt.rcParams['legend.edgecolor'] = '#dee2e6'
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['figure.titlesize'] = 13

def run_plotting(df, params):
    plot_type = params.get("plotType")
    cols = params.get("cols", [])
    col_x = params.get("colX")
    col_y = params.get("colY")
    group_col = params.get("groupCol") or params.get("hueCol")

    # Fallback if single colX/colY passed from legacy calls
    if not cols:
        cols = [c for c in [col_x, col_y] if c and c in df.columns]

    # Popup windows are ALWAYS displayed in light mode
    _apply_light_theme()

    PRIMARY = '#4c72b0'    # Seaborn classic blue
    SECONDARY = '#dd8452'  # Seaborn classic orange
    DANGER = '#c44e52'     # Seaborn classic red

    # 1. Heatmap Plot
    if plot_type == "heatmap":
        fig, ax = plt.subplots(figsize=(9, 6.5))
        fig.patch.set_facecolor('#ffffff')
        numeric_df = df[cols].select_dtypes(include=[np.number]).copy() if cols else df.select_dtypes(include=[np.number]).copy()
        if numeric_df.empty:
            for col in (cols if cols else df.columns):
                converted = pd.to_numeric(df[col], errors='coerce')
                if len(df) > 0 and converted.dropna().count() / len(df) >= 0.5:
                    numeric_df[col] = converted

        if numeric_df.empty or len(numeric_df.columns) < 2:
            ax.text(0.5, 0.5, "Requires at least 2 numeric columns\nfor correlation heatmap.",
                    ha='center', va='center', fontsize=12, color=DANGER)
            ax.set_axis_off()
        else:
            corr = numeric_df.corr()
            sns.heatmap(corr, annot=True, cmap='coolwarm', fmt=".2f", ax=ax, square=True,
                        linewidths=0.0,
                        annot_kws={"size": 10, "color": "white", "fontweight": "normal"},
                        cbar_kws={'shrink': 0.85})
            ax.set_title('Correlation Heatmap of Numeric Features', fontweight='normal', fontsize=12, pad=12)
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        plt.close('all')
        buf.seek(0)
        img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        return {"success": True, "imageData": img_b64, "plotType": plot_type}

    # 2. Scatter Plot
    if plot_type == "scatter":
        fig, ax = plt.subplots(figsize=(9, 6))
        fig.patch.set_facecolor('#ffffff')
        cx = cols[0] if len(cols) >= 1 else col_x
        cy = cols[1] if len(cols) >= 2 else col_y

        if not cx or not cy or cx not in df.columns or cy not in df.columns:
            ax.text(0.5, 0.5, "Scatter plot requires 2 valid columns (X and Y).",
                    ha='center', va='center', fontsize=12, color=DANGER)
            ax.set_axis_off()
        else:
            if group_col and group_col in df.columns:
                sns.scatterplot(data=df, x=cx, y=cy, hue=group_col, ax=ax, s=55, alpha=0.85, palette='deep', edgecolor='white', linewidth=0.5)
            else:
                val_x = pd.to_numeric(df[cx], errors='coerce')
                val_y = pd.to_numeric(df[cy], errors='coerce')
                ax.scatter(val_x, val_y, color=PRIMARY, alpha=0.8, s=55, edgecolors='white', linewidth=0.5)
            ax.set_xlabel(cx, fontsize=10)
            ax.set_ylabel(cy, fontsize=10)
            ax.set_title("{} vs {}".format(cx, cy), fontsize=12, pad=12)
            ax.grid(True, linestyle='-', alpha=0.6, color='#e0e0e0')

        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        plt.close('all')
        buf.seek(0)
        img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        return {"success": True, "imageData": img_b64, "plotType": plot_type}

    # 2. Box Plot (Single figure with side-by-side boxplots for all selected features)
    if plot_type == "boxplot":
        fig, ax = plt.subplots(figsize=(9, 6))
        fig.patch.set_facecolor('#ffffff')

        valid_cols = [c for c in cols if c in df.columns]
        if not valid_cols:
            valid_cols = list(df.select_dtypes(include=[np.number]).columns)

        valid_numeric = []
        for c in valid_cols:
            converted = pd.to_numeric(df[c], errors='coerce')
            if converted.notna().sum() > 0:
                valid_numeric.append(c)

        if not valid_numeric:
            ax.text(0.5, 0.5, "No valid numeric columns selected for boxplot.",
                    ha='center', va='center', fontsize=12, color=DANGER)
            ax.set_axis_off()
        else:
            plot_df = df[valid_numeric].apply(pd.to_numeric, errors='coerce')
            if group_col and group_col in df.columns:
                melted = pd.melt(df, id_vars=[group_col], value_vars=valid_numeric, var_name='Feature', value_name='Value')
                melted['Value'] = pd.to_numeric(melted['Value'], errors='coerce')
                sns.boxplot(data=melted.dropna(subset=['Value']), x='Feature', y='Value', hue=group_col, palette='deep', ax=ax, width=0.55, linewidth=1.2)
                ax.set_title("Box Plot of Selected Columns by {}".format(group_col), fontweight="normal", pad=15, fontsize=12)
            else:
                sns.boxplot(data=plot_df, palette='deep', ax=ax, width=0.45, linewidth=1.2)
                all_num = list(df.select_dtypes(include=[np.number]).columns)
                title_text = "Box Plot of Numeric Columns" if len(valid_numeric) == len(all_num) and len(all_num) > 0 else "Box Plot of Selected Columns"
                ax.set_title(title_text, fontweight='normal', pad=15, fontsize=12)

            ax.grid(True, axis='y', linestyle='-', alpha=0.4, color='#b0b0b0')
            ax.set_axisbelow(True)
            plt.xticks(rotation=15 if len(valid_numeric) > 4 else 0, fontsize=10)

        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        plt.close('all')
        buf.seek(0)
        img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        return {"success": True, "imageData": img_b64, "plotType": plot_type}

    # 3. Multi-Feature Subplot Grid (histogram, std-dev, bar, line)
    valid_cols = [c for c in cols if c in df.columns]
    if not valid_cols:
        print("No valid columns selected for plotting.", file=sys.stderr)
        sys.exit(1)

    num_plots = len(valid_cols)
    if num_plots == 1:
        fig, axes = plt.subplots(1, 1, figsize=(9, 5.5))
        axes_list = [axes]
    else:
        ncols = 2 if num_plots <= 4 else 3
        nrows = (num_plots + ncols - 1) // ncols
        fig, axes = plt.subplots(nrows, ncols, figsize=(5.5 * ncols, 4.2 * nrows))
        axes_list = list(axes.flatten()) if hasattr(axes, 'flatten') else [axes]

    fig.patch.set_facecolor('#ffffff')

    for i, col in enumerate(valid_cols):
        ax = axes_list[i]
        ax.grid(True, linestyle=':', alpha=0.5)

        if plot_type == "std-dev":
            data = pd.to_numeric(df[col], errors='coerce').dropna().values
            if len(data) > 0:
                mean = np.mean(data)
                std = np.std(data, ddof=1) if len(data) > 1 else 1.0
                x = np.linspace(mean - 4*std, mean + 4*std, 300)
                y = stats.norm.pdf(x, mean, std)
                ax.plot(x, y, color=PRIMARY, linewidth=2.5, label='Normal Dist')
                x1 = np.linspace(mean - std, mean + std, 100)
                ax.fill_between(x1, stats.norm.pdf(x1, mean, std), color=PRIMARY, alpha=0.25, label='±1σ (68.2%)')
                x2l = np.linspace(mean - 2*std, mean - std, 60)
                x2r = np.linspace(mean + std, mean + 2*std, 60)
                ax.fill_between(x2l, stats.norm.pdf(x2l, mean, std), color=SECONDARY, alpha=0.20, label='±2σ (95.4%)')
                ax.fill_between(x2r, stats.norm.pdf(x2r, mean, std), color=SECONDARY, alpha=0.20)
                x3l = np.linspace(mean - 3*std, mean - 2*std, 60)
                x3r = np.linspace(mean + 2*std, mean + 3*std, 60)
                ax.fill_between(x3l, stats.norm.pdf(x3l, mean, std), color=DANGER, alpha=0.12, label='±3σ (99.7%)')
                ax.fill_between(x3r, stats.norm.pdf(x3r, mean, std), color=DANGER, alpha=0.12)
                ax.axvline(mean, color="#6c757d", linestyle="--", linewidth=1.5, label="Mean: {:.2f}".format(mean))
                ax.set_title("Normal Dist — {}".format(col), fontweight="bold", fontsize=11)
                ax.set_xlabel(col)
                ax.set_ylabel('Density')
                ax.legend(loc='upper right', fontsize=8, framealpha=0.9)
            else:
                ax.text(0.5, 0.5, "No numeric data", ha='center', va='center')

        elif plot_type == "histogram":
            if group_col and group_col in df.columns:
                sns.histplot(data=df, x=col, hue=group_col, kde=True, ax=ax, alpha=0.55)
            else:
                data = pd.to_numeric(df[col], errors='coerce').dropna().values
                if len(data) > 0:
                    sns.histplot(data, kde=True, ax=ax, color=PRIMARY, bins='auto', alpha=0.55,
                                 edgecolor='white', linewidth=0.5,
                                 line_kws={"color": "#065f46", "linewidth": 2})
            ax.set_xlabel(col)
            ax.set_title("Histogram — {}".format(col), fontweight="bold", fontsize=11)

        elif plot_type == "bar":
            if group_col and group_col in df.columns:
                sns.countplot(data=df, x=col, hue=group_col, ax=ax)
                plt.setp(ax.get_xticklabels(), rotation=35, ha='right', fontsize=8)
            else:
                counts = df[col].astype(str).value_counts().head(30)
                colors = plt.cm.viridis(np.linspace(0.2, 0.85, max(len(counts), 1)))
                ax.bar(counts.index.astype(str), counts.values, color=colors, edgecolor='white', linewidth=0.5)
                ax.set_ylabel('Count')
                plt.setp(ax.get_xticklabels(), rotation=35, ha='right', fontsize=8)
            ax.set_xlabel(col)
            ax.set_title("Bar Chart — {}".format(col), fontweight="bold", fontsize=11)

        elif plot_type == "line":
            if group_col and group_col in df.columns:
                y_vals = pd.to_numeric(df[col], errors='coerce')
                sns.lineplot(data=df, x=df.index, y=y_vals, hue=group_col, ax=ax, marker='o')
            else:
                y_vals = pd.to_numeric(df[col], errors='coerce').dropna().values
                ax.plot(y_vals, color=PRIMARY, marker='o', markersize=4, linewidth=2)
                ax.set_xlabel('Index')
                ax.set_ylabel(col)
            ax.set_title("Line Graph — {}".format(col), fontweight="bold", fontsize=11)

    # Hide unused subplots if any
    for j in range(num_plots, len(axes_list)):
        fig.delaxes(axes_list[j])

    fig.suptitle("Visualisation Studio — {}".format(plot_type.upper()), fontsize=13, fontweight="bold", y=0.99)
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
    plt.close('all')
    buf.seek(0)
    img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
    return {"success": True, "imageData": img_b64, "plotType": plot_type}

import io
import base64

def generate_single_plot_base64(df, plot_type, col_x=None, col_y=None):
    plt.style.use('dark_background')
    plt.rcParams['figure.facecolor'] = '#060b07'
    plt.rcParams['axes.facecolor'] = '#0c150e'
    buf = io.BytesIO()
    
    PRIMARY = '#10b981'
    SECONDARY = '#f59e0b'
    DANGER = '#ef4444'

    if plot_type == "pairplot":
        numeric_cols = [c for c in df.columns if pd.to_numeric(df[c], errors='coerce').notna().sum() > 0]
        if len(numeric_cols) < 2:
            return ""
        plot_df = df[numeric_cols].apply(pd.to_numeric, errors='coerce').dropna()
        if len(plot_df) == 0:
            return ""
        g = sns.pairplot(plot_df, corner=False, height=2.2, aspect=1.1,
                         plot_kws={'alpha': 0.65, 's': 25, 'color': PRIMARY},
                         diag_kws={'color': PRIMARY, 'alpha': 0.6})
        g.fig.patch.set_facecolor('#0d160f')
        for ax_item in g.axes.flat:
            if ax_item is not None:
                ax_item.set_facecolor('#060b07')
                ax_item.tick_params(colors='#e2f1e6', labelsize=8)
                for spine in ax_item.spines.values():
                    spine.set_color('#1a3221')
                if ax_item.xaxis.label: ax_item.xaxis.label.set_color(PRIMARY)
                if ax_item.yaxis.label: ax_item.yaxis.label.set_color(PRIMARY)
        buf_pair = io.BytesIO()
        g.fig.savefig(buf_pair, format='png', facecolor='#0d160f', edgecolor='none', bbox_inches='tight', dpi=100)
        plt.close(g.fig)
        buf_pair.seek(0)
        return "data:image/png;base64," + base64.b64encode(buf_pair.read()).decode('utf-8')

    plt.rcParams['figure.facecolor'] = '#0d160f'
    plt.rcParams['axes.facecolor'] = '#060b07'
    plt.rcParams['axes.edgecolor'] = '#1a3221'
    plt.rcParams['grid.color'] = '#1a3221'
    plt.rcParams['text.color'] = '#e2f1e6'
    plt.rcParams['axes.labelcolor'] = '#10b981'
    plt.rcParams['xtick.color'] = '#8ca293'
    plt.rcParams['ytick.color'] = '#8ca293'
    plt.rcParams['font.family'] = 'sans-serif'
    
    fig, ax = plt.subplots(figsize=(8.5, 5))

    if plot_type == "boxplot":
        numeric_cols = [c for c in df.columns if pd.to_numeric(df[c], errors='coerce').notna().sum() > 0]
        if not numeric_cols:
            plt.close(fig)
            return ""
        plot_df = df[numeric_cols].apply(pd.to_numeric, errors='coerce')
        sns.boxplot(data=plot_df, palette='Set2', ax=ax, width=0.45)
        ax.set_title('Box Plot of Numeric Features', pad=15, color=PRIMARY, fontweight='bold')
        ax.grid(True, axis='y', linestyle='-', alpha=0.3, color='#1a3221')

    elif plot_type == "std-dev":
        if not col_x or col_x not in df.columns:
            plt.close(fig)
            return ""
        data = pd.to_numeric(df[col_x], errors='coerce').dropna().values
        if len(data) == 0:
            plt.close(fig)
            return ""
        mean = np.mean(data)
        std = np.std(data, ddof=1) if len(data) > 1 else 1.0
        x = np.linspace(mean - 4*std, mean + 4*std, 250)
        y = stats.norm.pdf(x, mean, std)
        ax.plot(x, y, color=PRIMARY, linewidth=2.5, label='Normal Distribution')
        x1 = np.linspace(mean - std, mean + std, 100)
        ax.fill_between(x1, stats.norm.pdf(x1, mean, std), color=PRIMARY, alpha=0.3, label='±1σ (68.2%)')
        x2_left = np.linspace(mean - 2*std, mean - std, 50)
        x2_right = np.linspace(mean + std, mean + 2*std, 50)
        ax.fill_between(x2_left, stats.norm.pdf(x2_left, mean, std), color=SECONDARY, alpha=0.2, label='±2σ (95.4%)')
        ax.fill_between(x2_right, stats.norm.pdf(x2_right, mean, std), color=SECONDARY, alpha=0.2)
        x3_left = np.linspace(mean - 3*std, mean - 2*std, 50)
        x3_right = np.linspace(mean + 2*std, mean + 3*std, 50)
        ax.fill_between(x3_left, stats.norm.pdf(x3_left, mean, std), color=DANGER, alpha=0.1, label='±3σ (99.7%)')
        ax.fill_between(x3_right, stats.norm.pdf(x3_right, mean, std), color=DANGER, alpha=0.1)
        ax.axvline(mean, color="#ffffff", linestyle="--", linewidth=1.5, label="Mean: {:.2f}".format(mean))
        ax.set_title("Normal Distribution: {}".format(col_x), pad=15, color=PRIMARY, fontweight="bold")
        ax.set_xlabel(col_x)
        ax.set_ylabel('Probability Density')
        legend = ax.legend(loc='upper right')
        plt.setp(legend.get_texts(), color='#e2f1e6')

    elif plot_type == "histogram":
        if not col_x or col_x not in df.columns:
            plt.close(fig)
            return ""
        data = pd.to_numeric(df[col_x], errors='coerce').dropna().values
        if len(data) == 0:
            plt.close(fig)
            return ""
        sns.histplot(data, kde=True, ax=ax, color=PRIMARY, bins='auto', alpha=0.55,
                     edgecolor='#1a3221', linewidth=0.5,
                     line_kws={"color": "#34d399", "linewidth": 2})
        ax.set_xlabel(col_x)
        ax.set_ylabel('Frequency')
        ax.set_title("Distribution Histogram: {}".format(col_x), pad=15, color=PRIMARY, fontweight="bold")

    elif plot_type == "heatmap":
        numeric_df = df.select_dtypes(include=[np.number]).copy()
        for col in df.columns:
            converted = pd.to_numeric(df[col], errors='coerce')
            if len(df) > 0 and converted.dropna().count() / len(df) >= 0.5:
                numeric_df[col] = converted
        if numeric_df.empty or len(numeric_df.columns) < 2:
            plt.close(fig)
            return ""
        corr = numeric_df.corr()
        sns.heatmap(corr, annot=True, cmap='YlGn', fmt=".2f", ax=ax, square=True,
                    linewidths=0.5, linecolor='#1a3221', annot_kws={"size": 9, "color": "#212529"})
        ax.set_title('Pearson Correlation Heatmap', pad=15, color=PRIMARY, fontweight='bold')
    else:
        plt.close(fig)
        return ""

    ax.grid(True, linestyle=':', alpha=0.4)
    plt.tight_layout()
    plt.savefig(buf, format='png', facecolor='#0d160f', edgecolor='none', bbox_inches='tight', dpi=100)
    plt.close(fig)
    buf.seek(0)
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return "data:image/png;base64," + img_str


def run_report_images(df, params):
    results = []
    numeric_cols = [c for c in df.columns if pd.to_numeric(df[c], errors='coerce').notna().sum() > 0]

    # 1. Box plot of numeric columns
    box_b64 = generate_single_plot_base64(df, "boxplot")
    if box_b64:
        results.append({"title": "Box & Whisker Plot (All Numeric Features)", "data": box_b64})

    # 2. Correlation heatmap
    if len(numeric_cols) >= 2:
        heat_b64 = generate_single_plot_base64(df, "heatmap")
        if heat_b64:
            results.append({"title": "Pearson Correlation Matrix Heatmap", "data": heat_b64})

    # 3. Distribution histograms & normal curves for numeric columns
    for col in numeric_cols:
        hist_b64 = generate_single_plot_base64(df, "histogram", col)
        if hist_b64:
            results.append({"title": "Distribution Histogram — {}".format(col), "data": hist_b64})

        norm_b64 = generate_single_plot_base64(df, "std-dev", col)
        if norm_b64:
            results.append({"title": "Normal Curve & Std Dev Bounds — {}".format(col), "data": norm_b64})

    # 4. Pair Plot Scatter Matrix
    if len(numeric_cols) >= 2:
        pair_b64 = generate_single_plot_base64(df, "pairplot")
        if pair_b64:
            results.append({"title": "Pair Plot Scatter Matrix", "data": pair_b64})

    return results


def run_pairplot(df, params):
    """Seaborn pairplot: scatter matrix + KDE diagonal, colored by hue col."""
    hue_col = params.get("hueCol")

    sns.set_theme(style="whitegrid", palette="tab10")
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.size'] = 9

    numeric_cols = []
    for col in df.columns:
        converted = pd.to_numeric(df[col], errors='coerce')
        if len(df) > 0 and converted.dropna().count() / len(df) >= 0.8:
            numeric_cols.append(col)

    if len(numeric_cols) < 2:
        fig, ax = plt.subplots(figsize=(6, 3))
        fig.patch.set_facecolor('#ffffff')
        ax.text(0.5, 0.5, "Pair plot requires at least\n2 numeric columns in the dataset.",
                ha='center', va='center', fontsize=13, color='#ef4444')
        ax.set_axis_off()
        buf = io.BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        plt.close('all')
        buf.seek(0)
        img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
        return {"success": True, "imageData": img_b64, "plotType": plot_type}

    numeric_cols = numeric_cols[:6]
    plot_df = df[numeric_cols].copy()
    for col in numeric_cols:
        plot_df[col] = pd.to_numeric(plot_df[col], errors='coerce')

    use_hue = None
    if hue_col and hue_col in df.columns:
        hue_series = df[hue_col].astype(str)
        top_cats = hue_series.value_counts().head(8).index
        hue_series = hue_series.where(hue_series.isin(top_cats), other='Other')
        plot_df[hue_col] = hue_series.values
        use_hue = hue_col

    plot_df = plot_df.dropna()
    if len(plot_df) == 0:
        print("No valid rows after dropping NaN values.", file=sys.stderr)
        sys.exit(1)

    # Exclude hue col from vars — it is now a string (object dtype)
    plot_vars = [col for col in numeric_cols if col != use_hue]
    if len(plot_vars) < 2:
        print("Not enough purely numeric columns (excluding hue) for pairplot.", file=sys.stderr)
        sys.exit(1)

    g = sns.pairplot(
        plot_df,
        vars=plot_vars,
        hue=use_hue,
        diag_kind='kde',
        kind='scatter',
        plot_kws={'alpha': 0.85, 's': 35, 'edgecolor': 'white', 'linewidth': 0.5},
        diag_kws={'fill': True, 'alpha': 0.35, 'linewidth': 1.5, 'warn_singular': False},
        palette='deep',
        height=2.1,
        aspect=1.0,
        corner=False
    )

    for row_axes in g.axes:
        for ax in row_axes:
            if ax is not None:
                ax.set_facecolor('white')
                ax.grid(True, color='#e0e0e0', linewidth=0.6, linestyle='-')
                for spine in ax.spines.values():
                    spine.set_visible(True)
                    spine.set_edgecolor('#b0b0b0')
                    spine.set_linewidth(0.6)
                ax.tick_params(labelsize=8, length=3)

    if use_hue and g.legend is not None:
        g.legend.set_title(hue_col)
        g.legend.get_title().set_fontsize(9)
        g.legend.get_title().set_fontweight('normal')
        for text in g.legend.get_texts():
            text.set_fontsize(8)

    g.figure.patch.set_facecolor('white')
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
    plt.close('all')
    buf.seek(0)
    img_b64 = "data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
    return {"success": True, "imageData": img_b64, "plotType": "pairplot"}


def main():
    args = parse_args()
    df = load_data(args.file)
    params = json.loads(args.params)

    if args.cmd == "summary_stats":
        result = run_summary_stats(df)
        print(json.dumps(result))

    elif args.cmd == "chi_square":
        result = run_chi_square(df, params)
        print(json.dumps(result))

    elif args.cmd == "clean_data":
        result = run_clean_data(df, params)
        print(json.dumps(result))

    elif args.cmd == "plot":
        res = run_plotting(df, params)
        print(json.dumps(res))

    elif args.cmd == "pairplot":
        res = run_pairplot(df, params)
        print(json.dumps(res))

    elif args.cmd == "report_images":
        result = run_report_images(df, params)
        print(json.dumps(result))

    else:
        print("Unknown command: {}".format(args.cmd), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
