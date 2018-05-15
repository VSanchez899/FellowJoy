var submit = document.getElementById("formRequest");

submit.onsubmit = function() {
    alert('Thank you for comments and request we will get back to you soon')
}

window.onload = function() {
    if (screen.width > 767) {
        document.body.scrollTop = 196;
        document.documentElement.scrollTop = 196;
    }
    var screenHeight = screen.height;
    var screenWidth = screen.width;
    $("#backgroundImage").height(screenHeight);
}

window.onload = function() {
    console.log("resize");
    console.log($(".contactDiv").height())
    var neededHeight = $(".contactDiv").height();
    if (screen.width > 767) {
        $("#map").height(neededHeight)
    } else {
        $("#map").height("300px")
    }
}

window.onresize = function() {
    console.log("resize");
    console.log($(".contactDiv").height())
    var neededHeight = $(".contactDiv").height();
    if (screen.width > 767) {
        $("#map").height(neededHeight)
    } else {
        $("#map").height("300px")
    }
}