// function webSetOptions() {
//     var ws_options = document.getElementById("web-set-options")
//     console.log(ws_options.style.backgroundColor)
//     switch (ws_options.style.display)
//     {
//         case "none": ws_options.style.display = "block"
//         case "block": ws_options.style.display = "none"
//     }
// }

function webSetOptions() {
    if ($('#ws-options').is(':hidden')) {
        $('#ws-options').show()
    }
    else {
        $('#ws-options').hide()
    }
}

$(async function(){
    $('#ws-options').hide()
    $('#hw-star').click(webSetOptions)
})