/* This is for allowing a custom donation */

//global vars
var customDonation = document.getElementById("donationAmount");
var payCustom = document.getElementById("customDonation");
var moneyTotal = document.getElementById("totalDonation");

// sets whats originally selected and readonly
function setReadOnly() {
    var select = document.getElementById("select");
    select.selected = true;
    payCustom.readOnly = true;
    moneyTotal.textContent += " $0.00";
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
    dontationTotal();
};

payCustom.onchange = function() {
    var customAmount = document.getElementById("customDonation").value;
    if (customDonation.value === "custom") {
        console.log("working...");
        console.log(moneyTotal.value);
        // moneyTotal.textContent = "Total Donation: $0.00";
        if (!isNaN(customAmount)) {
            moneyTotal.textContent = "Total Donation: $" + customAmount;
            console.log(customAmount, "AHHHH");
        } else if (isNaN(customAmount)) {
            moneyTotal.textContent = "Total Donation: $0.00";
        }


        // customAmount.onchange = function() {

        // }
    }
}

function dontationTotal() {

    var setDonation = document.getElementById("donationAmount").value;


    if (setDonation != "custom") {
        moneyTotal.textContent = "Total Donation: $" + setDonation;
    }
}
document.addEventListener("load", setReadOnly());