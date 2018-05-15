window.onload = function() {
    if (screen.width > 1000) {
        document.body.scrollTop = 196;
        document.documentElement.scrollTop = 196;
    } else if (screen.width <= 767) {
        document.body.scrollTop = 50;
        document.documentElement.scrollTop = 50;
    } else if (screen.width >= 768) {
        document.body.scrollTop = 56;
        document.documentElement.scrollTop = 56;
    }

    var screenHeight = screen.height;
    var screenWidth = screen.width;
    console.log(screenHeight)
    console.log(screenWidth)
    $("#backgroundImage").height(screenHeight);
    // $(".aboutUsContent").css("marginTop") = screenHeight;

    $(".screenDiv").height(screenHeight);
    $(".aboutusHeaderMobile").height(screenHeight);
    $(".aboutusHeaderMobile").width(screenWidth);
}



// When the user clicks on the button, scroll to the top of the document
var arrow1 = document.getElementById("arrow1");
var arrow2 = document.getElementById("arrow2");

arrow1.onclick = function() {
    if (screen.width > 1000) {
        document.body.scrollTop = 1200; // For Safari
        document.documentElement.scrollTop = 1200; // For Chrome, Firefox, IE and Opera
    } else if (screen.width <= 767) {
        document.body.scrollTop = 1053;
        document.documentElement.scrollTop = 1053;
    }
}

arrow2.onclick = function() {
    if (screen.width > 1000) {
        document.body.scrollTop = 3215; // For Safari
        document.documentElement.scrollTop = 3215; // For Chrome, Firefox, IE and Opera
    } else if (screen.width <= 767) {
        document.body.scrollTop = 3100;
        document.documentElement.scrollTop = 3100;
    }
}

var arrow1Mobile = document.getElementById("arrow1Mobile");
var arrow2Mobile = document.getElementById("arrow2Mobile");

arrow1Mobile.onclick = function() {
    if (screen.width <= 767) {
        document.body.scrollTop = 800;
        document.documentElement.scrollTop = 800;
    }
}

arrow2Mobile.onclick = function() {
    if (screen.width <= 767) {
        document.body.scrollTop = 2555;
        document.documentElement.scrollTop = 2555;
    }
}