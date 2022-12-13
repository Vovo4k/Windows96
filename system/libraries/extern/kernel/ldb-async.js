/******************************************************
 *   IndexedDB for Windows 96 & LocalStorage spaces   *
 *   Copyright (C) Windows 96 Team 2022.              *
 ******************************************************/

!function () {
    if (localStorage.getItem('idxdbid')) {
        localStorage.setItem('storeid', localStorage.getItem('idxdbid'));
        localStorage.removeItem('idxdbid');
    }
    let idbID = localStorage.getItem('storeid');
    let hasMigrated = localStorage.getItem('has_migrated_lst');
    if (!idbID||idbID === 'null') {
        idbID = 'W96FS';
        localStorage.setItem('storeid', idbID);
    }
    let idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!idb) return void console.error("indexedDB not supported");

    function getKey(key, cb) {
        if (!idbrequest) {
            return setTimeout(() => {
                getKey(key, cb)
            }, 100);
        }
        return idbrequest.transaction("lse").objectStore("lse").get(key).onsuccess = (evt) => {
            let t = evt.target.result && evt.target.result.v || null;
            cb(t);
        }
    }

    let idbrequest = null;
    let database = idb.open(idbID, 1);

    database.onsuccess = () => {
        idbrequest = database.result
    }
    database.onerror = (evt) => {
        console.error("indexedDB request error", evt);
    }
    database.onupgradeneeded = (e) => {
        idbrequest = null;
        let oStore = e.target.result.createObjectStore("lse", {
            keyPath: "k"
        });
        oStore.transaction.oncomplete = (e) => {
            idbrequest = e.target.db
        }
    }
    window.localStorageDB = {
        getItem: getKey,
        setItem: (key, value) => {
            idbrequest.transaction("lse", "readwrite").objectStore("lse").put({
                k: key,
                v: value
            });
        },
        setItemAsync: (key, value, cb) => {
            var txn = idbrequest.transaction("lse", "readwrite");
            var os = txn.objectStore("lse");

            txn.oncomplete = ()=>cb();

            os.put({
                k: key,
                v: value
            });
        },
        removeItem: (key) => {
            idbrequest.transaction("lse", "readwrite").objectStore("lse").delete(key);
        }
    }

    let lS = window.localStorage;
    delete window.localStorage;
    if (!hasMigrated) {
        let osk = Object.keys(lS);
        for (let k of osk) {
            if (k == 'storeid') continue;
            if (k == 'idxdbid') continue;
            if (k.startsWith('global::')) continue;
            lS.setItem(`${idbID}::${k}`, lS.getItem(k));
            lS.removeItem(k);
        }
        lS.setItem('has_migrated_lst', true);
    }
    function keyToID(key) {
        if (key == 'storeid') return key;
        if (key == 'idxdbid') return key;
        if (key.startsWith('global::')) return key;
        return `${idbID}::${key}`;
    }
    function gI(key) {
        return backendLS[key] || lS.getItem(keyToID(key));
    }
    function sI(key, value) {
        if (Object.keys(backendLS).includes(key)) {
            console.warn("What did I tell you about your local System Administrator?");
            return true;
        }
        lS.setItem(keyToID(key), value);
        return true;
    }
    function rI(key) {
        if (Object.keys(backendLS).includes(key)) {
            console.warn("What did I tell you about your local System Administrator?");
            return true;
        }
        lS.removeItem(keyToID(key));
        return true;
    }
    function clearLS() {
        Object.keys(lS).filter(s => s.startsWith(`${idbID}::`)).map(s => lS.removeItem(s));
        return true;
    }
    function kLS(i) {
        return Object.keys(lS).filter(s => s.startsWith(`${idbID}::`))[i];
    }
    let backendLS = {
        getItem: gI,
        setItem: sI,
        removeItem: rI,
        clear: clearLS,
        key: kLS
    }
    let lSProxy = new Proxy(backendLS, {
        set: (_, key, value) => {
            return sI(key, value)
        },
        get: (_, key) => {
            return gI(key)
        },
        deleteProperty: (_, key) => {
            return rI(key);
        }
    });
    window.localStorage = lSProxy;
}();
