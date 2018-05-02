$('.shirtColor').on('click', function(e) {
    $('#shirt').attr('src', 'images/jacket' + ($('.shirtColor').index($(e.target))) + '.jpg');
});