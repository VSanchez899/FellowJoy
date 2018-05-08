$('.color').on('click', function(e) {
    $('#water').attr('src', 'images/water' + ($('.color').index($(e.target)) + 1) + '.jpg');
});

$('#waterOptions').change(function() {
    $("img[name=image-swap]").attr("src", $(this).val());
});