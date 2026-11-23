// Right-click a product link or page: save it through the app's own /save page.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "save", title: "Save to valette", contexts: ["page", "link"] });
});
chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.linkUrl || info.pageUrl;
  if (url) chrome.tabs.create({ url: `https://www.myvalette.com/save?url=${encodeURIComponent(url)}` });
});
