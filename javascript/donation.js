/* This is for allowing a custom donation */

//global vars
var customDonation = document.getElementById("donationAmount");
var payCustom = document.getElementById("customDonation");

// sets whats originally selected and readonly
function setReadOnly() {
    var select = document.getElementById("select");
    select.selected = true;
    payCustom.readOnly = true;
}

// lets you add custom donation
customDonation.onchange = function() {
    if (customDonation.value == "custom") {
        payCustom.readOnly = false;
        document.getElementById("donationLabel").textContent += "*";
        // document.getElementById("donationLabel").setAttribute("class", "text-danger")
        console.log("E-YES");
        console.log(customDonation.value);
    }
    // resets the custom donation
    if (customDonation.value != "custom") {
        payCustom.readOnly = true;
        payCustom.value = "";
        document.getElementById("donationLabel").innerHTML = "Custom Donation";
    }
};

function dontationTotal() {
    var moneyTotal = document.getElementById("totalDonation");
    var setDonation = document.getElementById("donationAmount").value;
    var customAmount = document.getElementById("customDonation").value;
    moneyTotal.textContent += " $" + setDonation;
}
customDonation.addEventListener("change", dontationTotal());
document.addEventListener("load", setReadOnly());