// Right-click a product link or page: send it to the shopping list or the closet through the app's own /save page.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "list", title: "Add to valette shopping list", contexts: ["page", "link"] });
  chrome.contextMenus.create({ id: "closet", title: "Add to my valette closet (I bought it)", contexts: ["page", "link"] });
});
chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.linkUrl || info.pageUrl;
  if (!url) return;
  const to = info.menuItemId === "closet" ? "to=closet&" : "";
  chrome.tabs.create({ url: `https://www.myvalette.com/save?${to}url=${encodeURIComponent(url)}` });
});
