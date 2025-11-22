import pandas as pd

# Read the full CSV
df = pd.read_csv(r'backend\data\df_merged_final.csv')

# Split into 2 equal parts
mid = len(df) // 2
df.iloc[:mid].to_csv('chunk_1.csv', index=False)
df.iloc[mid:].to_csv('chunk_2.csv', index=False)

print(f"Created chunk_1.csv ({mid} rows)")
print(f"Created chunk_2.csv ({len(df) - mid} rows)")
print("\nUpload chunk_1 first (creates table), then chunk_2 (append rows)")
#wslgi file
