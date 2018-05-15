window.onload = function() {
    if (screen.width > 1000) {
        document.body.scrollTop = 196;
        document.documentElement.scrollTop = 196;
    } else if (screen.width <= 767) {
        document.body.scrollTop = 160;
        document.documentElement.scrollTop = 160;
    } else if (screen.width >= 768) {
        document.body.scrollTop = 56;
        document.documentElement.scrollTop = 56;
    }

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