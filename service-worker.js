
async function storageGet(key) {
    let result = await chrome.storage.local.get([key])
    return result[key]
}

async function storageSet(key, value) {
    chrome.storage.local.set({[key]: value})
}

async function lock() {
    const id = Math.random()
    // console.log("id: " + id)
    let lock = await storageGet('lock')
    if (lock == null) {
        await storageSet('lock', id)
    }
    else {
        return true
    }
    await resolveAfter1ms()
    let confirm = await storageGet('lock')
    // console.log("confirm: " + confirm)
    return confirm !== id;
}

async function constWebStructure() {
    // let currentTabID = await storageGet('currentTabID')
    // const webStructure = {
    //     [currentTabID]: {}
    // }

    let currentTabIDs = await storageGet('currentTabIDs')
    const webStructure = {}
    for (let i in currentTabIDs) {
        webStructure[currentTabIDs[i]] = {}
    }

    storageSet('webStructure', webStructure)
    console.log("constWebStructure")
}

async function changeCurrentTabID() {
    let currentWindow = await chrome.windows.getLastFocused({populate: true})
    let currentTabs = await chrome.tabs.query({active: true})
    for (const tab of currentTabs) {
        if (tab.windowId === currentWindow.id) {
            let oldTabID = await storageGet('currentTabID')
            if (!(tab.id === oldTabID))
            storageSet('oldTabID', oldTabID)
            storageSet('currentTabID', tab.id)
            // console.log(tab.id)
        }
    }
}

chrome.tabs.onActivated.addListener(changeCurrentTabID)
chrome.windows.onFocusChanged.addListener(changeCurrentTabID)

function findTabLocation(tabStructure, targetTabID) {
    for (let tabID in tabStructure) {
        // console.log(tabID)
        if (tabID == targetTabID) {
            return [tabID]
        }
        if (JSON.stringify(tabStructure[tabID]) == "{}") {
            // console.log(tabID + ": {}")
            continue
        }
        // console.log(tabID + ": nest")
        let resultLocation = findTabLocation(tabStructure[tabID], targetTabID)
        // console.log(tabID + ": resultLocation")
        // console.log(resultLocation)
        if (resultLocation.length != 0) {
            // const returnLocation = [tabID]
            // returnLocation.push(...resultLocation)
            // return returnLocation
            resultLocation.push(tabID)
            return resultLocation
        }
    }
    // console.log(tabStructure + ": return []")
    return []
}

async function getCurrentTabIDs() {
    const tabIDs = []
    await chrome.windows.getAll({ populate: true }, function(windows) {
        windows.forEach(function (window) {
            window.tabs.forEach(function (tab) {
                tabIDs.push(tab.id)
            })
        })
    })
    // console.log(tabIDs)
    return tabIDs
}

async function getNewTabs() {
    let currentTabIDs = await getCurrentTabIDs()
    // console.log("currentTabIDs")
    // console.log(currentTabIDs)

    let oldTabIDs = await storageGet('currentTabIDs')
    // console.log("oldTabIDs")
    // console.log(oldTabIDs)

    const newTabIDs = []
    for (let i in currentTabIDs) {
        if (!oldTabIDs.includes(currentTabIDs[i])) {
            newTabIDs.push(currentTabIDs[i])
        }
    }
    await storageSet('currentTabIDs', currentTabIDs)
    return newTabIDs
}

function structureAdd(structure, targetID, content, s_name = 0) {
    if (s_name == targetID) {
        for (let i in content) {
            structure[i] = content[i]
        }
        return structure
    }
    // if (JSON.stringify(structure) == "{}") {
    //     return {}
    // }
    for (let ID in structure) {
        let resultStructure = structureAdd(structure[ID], targetID, content, ID)
        if (resultStructure == null) {
            continue
        }
        structure[ID] = resultStructure
        return structure
    }
    return null
}

function structureRemove(structure, targetIDs, s_name = 0) {
    for (let ID in structure) {
        // console.log("in " + s_name + " ID " + ID)
        // console.log(structure[ID])
        let resultStructure = structureRemove(structure[ID], targetIDs, Number(ID))
        // console.log("in " + s_name + " ID " + ID + " resultStructure")
        // console.log(resultStructure)
        delete structure[ID]
        for (let i in resultStructure) {
            structure[i] = resultStructure[i]
        }
    }
    // console.log("s_name " + s_name)
    // console.log(typeof targetIDs[0])
    if (targetIDs.includes(s_name) || (s_name == 0)) {
        // console.log("s_name " + s_name + " d_return")
        return structure
    }
    // console.log("s_name " + s_name + " return")
    return {[s_name]: structure}
}

async function getRemovedTabs() {
    let currentTabIDs = await getCurrentTabIDs()
    // console.log("currentTabIDs")
    // console.log(currentTabIDs)

    let oldTabIDs = await storageGet('currentTabIDs')
    // console.log("oldTabIDs")
    // console.log(oldTabIDs)

    const removedTabIDs = []
    for (let i in oldTabIDs) {
        if (!currentTabIDs.includes(oldTabIDs[i])) {
            removedTabIDs.push(oldTabIDs[i])
        }
    }
    await storageSet('currentTabIDs', currentTabIDs)
    return removedTabIDs
}

chrome.tabs.onCreated.addListener(async function() {
    if (await lock()) {
        console.log("onCreated: lock")
        return
    }
    console.log("onCreated: unlock")

    let newTabIDs = await getNewTabs()
    console.log("newTabIDs")
    console.log(newTabIDs)
    // storeCurrentTabIDs()

    let webStructure = await storageGet('webStructure')
    // console.log("webStructure")
    // console.log(webStructure)

    let currentTabID = await storageGet('currentTabID')
    // console.log("currentTabID")
    // console.log(currentTabID)

    let objectTabID
    if (newTabIDs.includes(currentTabID)) {
        objectTabID = await storageGet('oldTabID')
    }
    else {
        objectTabID = currentTabID
    }
    // console.log("objectTabID")
    // console.log(objectTabID)

    let addStructure = await storageGet('addStructure')
    if ((JSON.stringify(addStructure) == "{}")) {
        for (let i in newTabIDs) {
            // console.log(newTabIDs[i])
            addStructure[newTabIDs[i]] = {}
        }
    }
    else {
        storageSet('addStructure', {})
    }
    // console.log(addStructure)

    let newWebStructure = await structureAdd(webStructure, objectTabID, addStructure)
    console.log("newWebStructure")
    console.log(newWebStructure)

    storageSet('webStructure', newWebStructure)
    console.log("\n")
    storageSet('lock', null)
})

chrome.tabs.onRemoved.addListener(async function() {
    if (await lock()) {
        console.log("onRemoved: lock")
        return
    }
    console.log("onRemoved: unlock")

    let removedTabIDs = await getRemovedTabs()
    console.log("removedTabIDs")
    console.log(removedTabIDs)

    let webStructure = await storageGet('webStructure')
    // console.log("webStructure")
    // console.log(webStructure)

    let newWebStructure = await structureRemove(webStructure, removedTabIDs)
    console.log("newWebStructure")
    console.log(newWebStructure)

    storageSet('webStructure', newWebStructure)
    console.log("\n")
    storageSet('lock', null)
})

chrome.tabs.onReplaced.addListener

function resolveAfter1ms() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('resolved');
        }, 1);
    });
}

async function storeCurrentTabIDs() {
    let IDs = await getCurrentTabIDs()

    while (IDs.length == 0) {
        // console.log(1)
        await resolveAfter1ms()
    }

    await storageSet('currentTabIDs', IDs)
}

async function start1() {
    await storageSet('lock', 1)

    await storageSet('oldTabID', 0)
    storageSet('addStructure', {})
    storageSet('webStructure', {})
    await storageSet('currentTabID', 0)
    console.log("initialized storage")

    await changeCurrentTabID()
    console.log("changeCurrentTabID")
    console.log(await storageGet('currentTabID'))

    await storeCurrentTabIDs()
    console.log("storeCurrentTabIDs")
    console.log(await storageGet('currentTabIDs'))

    await constWebStructure()
    console.log(await storageGet('webStructure'))

    storageSet('lock', null)
    console.log('\n')
}

start1()


// async function test() {
//     const structure = {
//         '1': {
//             '3':{
//                 '5':{},
//                 '6':{}
//             },
//             '4':{}
//         },
//         '2': {}
//     }
//     let result = structureRemove(structure, ['3', '4'])
//     console.log(result)
// }
//
// test()