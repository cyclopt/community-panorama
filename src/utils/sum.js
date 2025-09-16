const sum = (arr = [], by = null, initial = 0) => arr.reduce((a, b) => a + (by ? b[by] : b), initial);

export default sum;
