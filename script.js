
// Navbar Scroll Effect
document.addEventListener("DOMContentLoaded", function() {
    let navbar = document.querySelector(".custom-navbar");

    window.addEventListener("scroll", function() {
        if (window.scrollY > 100) { 
            navbar.classList.add("nav-visible");
        } else {
            navbar.classList.remove("nav-visible");
        }
    });
});

// Swiper Slider Configuration
const swiper = new Swiper('.slider-wrapper', {
    loop: true,
    grabCursor: true,
    spaceBetween: 30,
    // Pagination bullets
    pagination: {
        el: '.swiper-pagination',
        clickable: true,
        dynamicBullets: true
    },
    // Navigation arrows
    navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
    },
    // Responsive breakpoints
    breakpoints: {
        0: {
            slidesPerView: 1
        },
        768: {
            slidesPerView: 2
        },
        1024: {
            slidesPerView: 3
        }
    }
});

//Smooth Scrolling 
document.addEventListener("DOMContentLoaded", function() {
    // Smooth scrolling for navbar links
    const scrollLinks = document.querySelectorAll(".scroll-link");

    scrollLinks.forEach(link => {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 70, // Adjust for navbar height
                    behavior: "smooth"
                });
            }
        });
    });
});

// Booking 
function openBooking(service, price) {
    // Set the service title
    document.getElementById("service-header").innerText = `${service} - ${price} (45 min)`;

    // Reset form fields
    document.getElementById("date").value = "";
    document.getElementById("client-name").value = "";
    document.getElementById("client-email").value = "";
    document.getElementById("client-phone").value = "";
    document.getElementById("assistance-details").value = "";

    // Reset dropdown selection
    populateTimeDropdown();
    document.getElementById("time").selectedIndex = 0;

    // Hide previous messages
    document.querySelector(".loading").style.display = "none";
    document.querySelector(".checkmark").style.display = "none";

    // Show booking pop-up
    document.getElementById("booking-card").style.display = "block";
    document.querySelector(".overlay").style.display = "block";
}

// Function to populate the time dropdown
function populateTimeDropdown() {
    let timeDropdown = document.getElementById("time");
    timeDropdown.innerHTML = ""; // Clear previous options

    // Generate time slots from 7 AM to 11 PM
    for (let hour = 7; hour <= 23; hour++) {
        let formattedHour = hour > 12 ? hour - 12 : hour;
        let amPm = hour >= 12 ? "PM" : "AM";
        let option = document.createElement("option");
        option.value = `${formattedHour}:00 ${amPm}`;
        option.textContent = `${formattedHour}:00 ${amPm}`;
        timeDropdown.appendChild(option);
    }
}

function closeBooking() {
    document.getElementById("booking-card").style.display = "none";
    document.querySelector(".overlay").style.display = "none";
}


//Booking Confirmed
function confirmBooking() {
    let date = document.getElementById("date").value;
    let time = document.getElementById("time").value;
    let clientName = document.getElementById("client-name").value;
    let email = document.getElementById("client-email").value;
    let phone = document.getElementById("client-phone").value;
    let assistance = document.getElementById("assistance-details").value;
    let errorMessage = document.querySelector(".missing-fields-error"); // Get the error message element

    // Hide previous messages
    document.querySelector(".loading").style.display = "none";
    document.querySelector(".checkmark").style.display = "none";
    document.querySelector(".error-message").style.display = "none";
    errorMessage.style.display = "none"; // Hide error message initially

    //  Check if any field is empty
    if (!date || !time || !clientName || !email || !phone || !assistance) {
        errorMessage.style.display = "block"; // Show the error message
        return;
    }

    let bookingData = {
        client_name: clientName,
        email: email,
        phone: phone,
        date: date,
        time: time,
        assistance: assistance
    };

    //  Show "Processing..." animation
    document.querySelector(".loading").style.display = "block";

    fetch("http://localhost:3000/book", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bookingData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.message); });
        }
        return response.json();
    })
    .then(data => {
        document.querySelector(".loading").style.display = "none"; // Hide processing animation

        if (data.message.includes("successfully")) {
            document.querySelector(".checkmark").style.display = "block"; //  Show success
            setTimeout(() => {
                closeBooking(); // Auto-close booking form after success
            }, 2000);
        } else {
            document.querySelector(".error-message").style.display = "block"; //  Show error
        }
    })
    .catch(error => {
        console.error(" Booking Error:", error);
        document.querySelector(".loading").style.display = "none";
        document.querySelector(".error-message").style.display = "block"; //  Show error
    });
}




// Fetch bookings for admin dashboard
async function fetchBookings() {
    try {
        let response = await fetch("http://localhost:3000/admin/bookings");
        let bookings = await response.json();

        let bookingsTable = document.getElementById("bookingsTable");
        bookingsTable.innerHTML = "<tr><th>Name</th><th>Email</th><th>Date</th><th>Time</th><th>Service</th></tr>";

        bookings.forEach(booking => {
            let row = `<tr>
                <td>${booking.client_name}</td>
                <td>${booking.email}</td>
                <td>${booking.date}</td>
                <td>${booking.time}</td>
                <td>${booking.assistance}</td>
            </tr>`;
            bookingsTable.innerHTML += row;
        });
    } catch (error) {
        console.error(" Error fetching bookings:", error);
    }
}

window.onload = fetchBookings;

