var visa = document.getElementById("visa");
var discover = document.getElementById("discover");
var amex = document.getElementById("amex");
var mastercard = document.getElementById("mastercard");
var cardNum = document.getElementById("formCard");
var submit = document.getElementById("submit");
console.log(visa.checked)

visa.onclick = function() {
    visa.checked = true;
    discover.checked = false;
    amex.checked = false;
    mastercard.checked = false;
    /* Visa Card */
    if (visa.checked === true) {
        cardNum.setAttribute("pattern", "^4[0-9]{12}(?:[0-9]{3})?$");
        console.log(visa.checked)
    }
}

discover.onclick = function() {
    discover.checked = true;
    amex.checked = false;
    mastercard.checked = false;
    visa.checked = false;
    if (discover.checked === true) {
        cardNum.setAttribute("pattern", "^6(?:011|5[0-9]{2})[0-9]{12}$");
    }
}

amex.onclick = function() {
    amex.checked = true;
    discover.checked = false;
    mastercard.checked = false;
    visa.checked = false;
    if (amex.checked === true) {
        cardNum.setAttribute("pattern", "^3[47][0-9]{13}$");
    }
}

mastercard.onclick = function() {
    mastercard.checked = true;
    discover.checked = false;
    amex.checked = false;
    visa.checked = false;
    if (mastercard.checked === true) {
        cardNum.setAttribute("pattern", "^(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}$");
    }
}

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