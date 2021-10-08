chrome.runtime.onInstalled.addListener(() => {
    var widget = chrome.extension.getBackgroundPage();
    widget.console.log('Hello B2');
});