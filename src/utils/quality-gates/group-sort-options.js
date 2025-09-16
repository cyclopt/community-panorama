const groupAndSortOptions = (options, category) => [...options].sort((a, b) => a[category].localeCompare(b[category]));

export default groupAndSortOptions;
