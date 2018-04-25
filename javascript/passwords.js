/*
    Capstone Project
    Author: Lucas Eastman
    Date: 3.26.18

    filename: passwords.js
*/

$("document").ready(function() {
  $(".passshow").change(function(e) {
    if(e.target.checked) {
      $("#" + $(e.target).attr("show")).attr("type", "text");
    } else {
      $("#" + $(e.target).attr("show")).attr("type", "password");
    }
  });
});
