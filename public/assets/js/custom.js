/* ----- Custom Scripts for Kaline template ----- */

jQuery(function($) {
    "use strict";



/*----- Preloader ----- */

    $(window).load(function() {
    		setTimeout(function() {
            $('#loading').fadeOut('slow', function() {
            });
        }, 300);
    });


/* --------- Wow Init -------*/

new WOW().init();


/*----------------------------
------- Isotope Init -------
-----------------------------*/

$(window ).load(function() {

var $container = $('.portfolio_container');
$container.isotope({
	filter: '*',
});

$('.origin-portfolio_filter a').on('click', function () {
	$('.origin-portfolio_filter .active').removeClass('active');
	$(this).addClass('active');

	var selector = $(this).attr('data-filter');
	$container.isotope({
			filter: selector,
			animationOptions: {
					duration: 500,
					animationEngine: "jquery"
			}
	});
	return false;
});

});


});
