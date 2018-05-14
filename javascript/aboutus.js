window.onload = function() {
    document.body.scrollTop = 300;
    document.documentElement.scrollTop = 300;
}



// When the user clicks on the button, scroll to the top of the document


document.getElementById("arrow").onclick = function topFunction() {
    document.body.scrollTo = 1300; // For Safari
    document.documentElement.scrollTo = 1300; // For Chrome, Firefox, IE and Opera
}