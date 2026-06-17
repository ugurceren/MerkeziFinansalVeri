namespace MerkeziFinansalVeri.Infrastructure.Services;

/// <summary>
/// SQL LEFT(column, LEN(@bound)) ile uyumlu metin aralığı filtresi.
/// </summary>
internal static class LedgerLeftFilter
{
    public static IReadOnlyList<Dictionary<string, object?>> Apply(
        IReadOnlyList<Dictionary<string, object?>> rows,
        string columnName,
        string? min,
        string? max)
    {
        var minBound = TrimOrNull(min);
        var maxBound = TrimOrNull(max);

        if (minBound is null && maxBound is null)
        {
            return rows;
        }

        return rows
            .Where(row => MatchesRange(GetCell(row, columnName), minBound, maxBound))
            .ToList();
    }

    public static bool MatchesRange(string? cellValue, string? min, string? max)
    {
        var value = TrimOrNull(cellValue);
        if (value is null)
        {
            return min is null && max is null;
        }

        if (min is not null)
        {
            var leftMin = SqlLeft(value, min.Length);
            if (string.Compare(leftMin, min, StringComparison.OrdinalIgnoreCase) < 0)
            {
                return false;
            }
        }

        if (max is not null)
        {
            var leftMax = SqlLeft(value, max.Length);
            if (string.Compare(leftMax, max, StringComparison.OrdinalIgnoreCase) > 0)
            {
                return false;
            }
        }

        return true;
    }

    private static string SqlLeft(string value, int length)
    {
        if (length <= 0)
        {
            return string.Empty;
        }

        return value.Length <= length ? value : value[..length];
    }

    private static string? GetCell(IReadOnlyDictionary<string, object?> row, string columnName)
    {
        if (row.TryGetValue(columnName, out var direct) && direct is not null)
        {
            return Convert.ToString(direct);
        }

        var key = row.Keys.FirstOrDefault(k => string.Equals(k, columnName, StringComparison.OrdinalIgnoreCase));
        if (key is null || !row.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return Convert.ToString(value);
    }

    private static string? TrimOrNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
