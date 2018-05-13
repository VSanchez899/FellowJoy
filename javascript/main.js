// /* 
//     Capstone Project
//     Authors: Jamin, Vinny, Jacson
//     Date: 3.2.18

//     filename: main.js
// */

// document.addEventListener("click", makeDonationLinkTest);

// var signedIn = false;
// var makeDonation = document.getElementById("donationLink");

// function makeDonationLinkTest(donation) {
//     if (donation == true) {
//         signedIn = true;
//     }
//     if (signedIn == false) {
//         makeDonation.href = "../html/makeDonation_noUser.html";
//     } else if (signedIn == true) {
//         makeDonation.href = "../html/makeDonation_User.html";
//     }
//     // console.log(signIn);
// }


// // =================================================================================

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function() { scrollFunction() };

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        document.getElementById("myBtn").style.display = "block";
    } else {
        document.getElementById("myBtn").style.display = "none";
    }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
    document.body.scrollTop = 0; // For Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}