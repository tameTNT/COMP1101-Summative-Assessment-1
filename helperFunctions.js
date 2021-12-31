const fetch = require('node-fetch');
// todo: add proper JSDocs to everything

module.exports.isEmpty = function (obj) {
  // https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
  // because Object.keys(new Date()).length === 0;
  // we have to do some additional check
  return obj && // 👈 null and undefined check
    Object.keys(obj).length === 0 &&
    Object.getPrototypeOf(obj) === Object.prototype;
};

/**
 * @param {Object[]} list
 * @param {Number[]} ids
 * @return {Object[]}
 */
const search = function (list, ids) {
  const results = [];
  for (const item of list) {
    if (ids.includes(item.id)) {
      results.push(item);
    }
  }
  return results;
};

/**
 * @param {Object[]} toSearch
 * @param {String} paramId
 * @param {String} queryIds
 * @return {Object[]}
 */
module.exports.handleIdUrl = function (toSearch, paramId, queryIds) {
  if (paramId !== undefined) {
    const paramIdNum = Number(paramId);
    return search(toSearch, [paramIdNum]);
  } else if (queryIds) {
    const commaSplitRegexp = /, */;
    const queryIdsArray = queryIds.split(commaSplitRegexp).map((s) => Number(s));
    return search(toSearch, queryIdsArray);
  } else {
    return toSearch;
  }
};

/**
 * @param {String} redditUrl
 * @return {Object|undefined}
 */
module.exports.getRedditData = async function (redditUrl) {
  const redditJSONUrl = redditUrl + '.json';
  const redditResponse = await fetch(redditJSONUrl);
  const redditJSON = await redditResponse.json();
  if (!redditJSON.error) {
    return redditJSON[1].data.children[0].data;
  } else {
    return undefined;
  }
};

module.exports.updateCardRedditData = async function (cardObj, newRedditData) {
  const newCardObj = cardObj;
  newCardObj.redditData = (({ score, author }) => ({
    score,
    author
  }))(newRedditData);

  if (newRedditData.replies !== '') {
    newCardObj.redditData.numSubComments = newRedditData.replies.data.children.length;
  } else {
    newCardObj.redditData.numSubComments = 0;
  }

  return newCardObj;
};
