module.exports.isEmpty = function (obj) {
  // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
  // because Object.keys(new Date()).length === 0;
  // we have to do some additional check
  return obj && // 👈 null and undefined check
    Object.keys(obj).length === 0 &&
    Object.getPrototypeOf(obj) === Object.prototype;
};

const search = function (list, ids) {
  const results = [];
  for (const item of list) {
    if (ids.includes(item.id)) {
      results.push(item);
    }
  }
  return results;
};

module.exports.handleIdUrl = function (toSearch, paramId, queryIds) {
  if (paramId !== undefined) {
    paramId = Number(paramId);
    return search(toSearch, [paramId]);
  } else if (queryIds) {
    const commaSplitRegex = /, */;
    queryIds = queryIds.split(commaSplitRegex).map((s) => Number(s));
    return search(toSearch, queryIds);
  } else {
    return toSearch;
  }
};
