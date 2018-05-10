var visa = document.getElementById("visa");
var discover = document.getElementById("discover");
var amex = document.getElementById("amex");
var mastercard = document.getElementById("mastercard");
var cardNum = document.getElementById("formCard");
var CVC = document.getElementById("formCVC");
var donationForm = document.getElementById("donationForm");
var submit = document.getElementById("submit");
var useCardInfo = document.getElementById("useInfoAbove");
var visaGear = document.getElementById("visaGear");
var discoverGear = document.getElementById("discoverGear");
var amexGear = document.getElementById("amexGear");
var mastercardGear = document.getElementById("mastercardGear");
var cardNumGear = document.getElementById("formCardGear");
var CVCGear = document.getElementById("formCVCGear");


// var fName = document.getElementById("formFirstN");

// function changeFirstLetter() {
//     fnameRest = []
//     fNameValue = fName.value;
//     var firstLetter = fNameValue[0];
//     fnameRest.push(fNameValue);
//     // fName.splice(1, firstLetter);
//     console.log(firstLetter)
//     console.log(fnameRest)
//     console.log(fName)
//     firstLetter = firstLetter.toUpperCase();
//     // console.log(firstLetter)
//     // console.log(firstLetter + fnameRest)

// }

// fName.addEventListener("change", changeFirstLetter)

visa.onclick = function() {
    visa.checked = true;
    discover.checked = false;
    amex.checked = false;
    mastercard.checked = false;
    /* Visa Card */
    if (visa.checked === true) {
        cardNum.setAttribute("pattern", "^4[0-9]{12}(?:[0-9]{3})?$");
        CVC.setAttribute("pattern", "^[0-9]{3}$");
        cardNumGear.setAttribute("pattern", "^4[0-9]{12}(?:[0-9]{3})?$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
        visaGear.checked = true;
        discoverGear.checked = false;
        amexGear.checked = false;
        mastercardGear.checked = false;
    }
}

visaGear.onclick = function() {
    visaGear.checked = true;
    discoverGear.checked = false;
    amexGear.checked = false;
    mastercardGear.checked = false;
    /* Visa Card */
    if (visaGear.checked === true) {
        cardNumGear.setAttribute("pattern", "^4[0-9]{12}(?:[0-9]{3})?$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
    }
}

discover.onclick = function() {
    discover.checked = true;
    amex.checked = false;
    mastercard.checked = false;
    visa.checked = false;
    if (discover.checked === true) {
        cardNum.setAttribute("pattern", "^6(?:011|5[0-9]{2})[0-9]{12}$");
        CVC.setAttribute("pattern", "^[0-9]{3}$");
        cardNumGear.setAttribute("pattern", "^6(?:011|5[0-9]{2})[0-9]{12}$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
        visaGear.checked = false;
        discoverGear.checked = true;
        amexGear.checked = false;
        mastercardGear.checked = false;
    }
}

discoverGear.onclick = function() {
    discoverGear.checked = true;
    amexGear.checked = false;
    mastercardGear.checked = false;
    visaGear.checked = false;
    if (discoverGear.checked === true) {
        cardNumGear.setAttribute("pattern", "^6(?:011|5[0-9]{2})[0-9]{12}$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
    }
}

amex.onclick = function() {
    amex.checked = true;
    discover.checked = false;
    mastercard.checked = false;
    visa.checked = false;
    if (amex.checked === true) {
        cardNum.setAttribute("pattern", "^3[47][0-9]{13}$");
        CVC.setAttribute("pattern", "^[0-9]{4}$");
        cardNumGear.setAttribute("pattern", "^3[47][0-9]{13}$");
        CVCGear.setAttribute("pattern", "^[0-9]{4}$");
        visaGear.checked = false;
        discoverGear.checked = false;
        amexGear.checked = true;
        mastercardGear.checked = false;
    }
}

amexGear.onclick = function() {
    amexGear.checked = true;
    discoverGear.checked = false;
    mastercardGear.checked = false;
    visaGear.checked = false;
    if (amexGear.checked === true) {
        cardNumGear.setAttribute("pattern", "^3[47][0-9]{13}$");
        CVCGear.setAttribute("pattern", "^[0-9]{4}$");
    }
}

mastercard.onclick = function() {
    mastercard.checked = true;
    discover.checked = false;
    amex.checked = false;
    visa.checked = false;
    if (mastercard.checked === true) {
        cardNum.setAttribute("pattern", "^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$");
        CVC.setAttribute("pattern", "^[0-9]{3}$");
        cardNumGear.setAttribute("pattern", "^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
        visaGear.checked = false;
        discoverGear.checked = false;
        amexGear.checked = false;
        mastercardGear.checked = true;

    }
}

mastercardGear.onclick = function() {
    mastercardGear.checked = true;
    discoverGear.checked = false;
    amexGear.checked = false;
    visaGear.checked = false;
    if (mastercardGear.checked === true) {
        cardNumGear.setAttribute("pattern", "^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$");
        CVCGear.setAttribute("pattern", "^[0-9]{3}$");
    }
}




// var twilio = require('twilio');

// // Find your account sid and auth token in your Twilio account Console.
// var client = new twilio('AC77354bed67d3e6410cf0faa9e36454bd', 'a8531e84ec83cbd1fd7fe7017ff7e9a2');

// // Send the text message.



// donationForm.onsubmit = function() {
//     alert("Thank you so much for your donation");
//     client.messages.create({
//         to: '6024320525',
//         from: '6233001752',
//         body: 'Hello from Twilio!'
//     });
// }



// submit.addEventListener("onsumbit", cardTypeCVC);

// mastercard regex
// ^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$

//Discover
// ^6(?:011|5[0-9]{2})[0-9]{12}$

// Visa
// ^4[0-9]{12}(?:[0-9]{3})?$

// American Express
// ^3[47][0-9]{13}$


// cvc 3
// ^[0-9]{3}$

// cvc 4
// ^[0-9]{4}$