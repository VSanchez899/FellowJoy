/* 
    Capstone Project
    Authors: Jamin, Vinny, Jacson
    Date: 3.2.18

    filename: main.js
*/

document.addEventListener("click", makeDonationLinkTest);

var signedIn = false;
var makeDonation = document.getElementById("donationLink");

function makeDonationLinkTest(donation) {
    if (donation == true) {
        signedIn = true;
    }
    if (signedIn == false) {
        makeDonation.href = "../html/makeDonation_noUser.html";
    } else if (signedIn == true) {
        makeDonation.href = "../html/makeDonation_User.html";
    }
    // console.log(signIn);
}


// =================================================================================