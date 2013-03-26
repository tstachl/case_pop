// let's check if the user has enabled case pop
chrome.storage.sync.get('case_pop', function(items) {
  chrome.browserAction.setIcon({ path: items.case_pop ? 'icons/icon38.png' : 'icons/icon38_offline.png' });
});

// called when the user clicks on the icon
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.storage.sync.get('case_pop', function(items) {
    if (items.case_pop) {
      chrome.storage.sync.set({ case_pop: false }, function() {
        chrome.browserAction.setIcon({ path: 'icons/icon38_offline.png' });
      });
    } else {
      chrome.storage.sync.set({ case_pop: true }, function() {
        chrome.browserAction.setIcon({ path: 'icons/icon38.png' });
      });
    }
  });
});

// we intercept tabs with the url pointed to cases
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // if case pop is enabled we need to process further
  chrome.storage.sync.get('case_pop', function(items) {
    if (items.case_pop && changeInfo.url && changeInfo.url.match(/\.desk\.com\/agent\/case\/([0-9]+)/)) {
      // let's extract the case number
      var case_num = changeInfo.url.match(/case\/([0-9]+)/)[1],
          site     = changeInfo.url.match(/^[a-z]+:\/\/([^\/]*)\.desk\.com.*/)[1],
          tab, script, xhr, case_id;
      
      // get the desk.com agent tab if exists
      chrome.tabs.query({ url: '*://' + site + '.desk.com/agent' }, function(tabs) {
        if (tabs.length > 0) {
          tab = tabs[0];
          
          // get the id of the case
          xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
              // find the case id in the response text
              case_id = xhr.responseText.match(/tickets\/([0-9]+)\/edit/m)[1];
              if (case_id) {
                // close the original tab *should fix the read-only problem*
                chrome.tabs.remove(tabId);
                // activate the agent tab
                chrome.tabs.update(tab.id, { selected: true }, function() {
                  // build the script to load the case
                  script = [
                    "var s,ref;",
                    "s=document.createElement('script');",
                    "s.type='text/javascript';",
                    "s.innerText='(function(){ticketEditTableView(" + case_id + ",document.createEvent(\"MouseEvents\"));})();';",
                    "ref=document.getElementsByTagName('script')[0];",
                    "ref.parentNode.insertBefore(s,ref);"
                  ].join('');
                  // window.ticketShowTableView(' + case_id + ', document.createEvent(\'MouseEvents\'))
                  chrome.tabs.executeScript(tab.id, { code: script });
                });
              }
            }
          };
          xhr.open('GET', changeInfo.url, true);
          xhr.send();
        }
      });
    }
  });
});