new Vue({
    el: "#app",
    data: {
        sitename: "After School Club",
        showProduct: true, // default
        subjects: [], // JSON data stored in an array
        cart: [], // array to store items in shopping cart
        sortPrice: "Price", // Default sorting type - price
        sortTitle: "Title", // Default sorting type - title
        sortLocation: "Location", // Default sorting type - location
        sortAvailability: "Availability", // Default sorting type - availability
        // searchText: "", // User's search input
        sortCategory: null, // Default selection
        sortOrder: null, // Default selection
        confirmationText: "", // Message to display after checkout
        orderSubmitted: false, // Flag to indicate if the order has been submitted
        name: "", // Validation for checkout
        phone: "", // Validation for checkout
        isCheckoutEnabled: false, // Validation for checkout
        searchKeyword: '', // Add a new data property for the search keyword
        searchResults: [], // Add a new data property for search results
    },
    mounted: function () {
        // Fetch data as soon as the homepage loads
        this.fetchSubjects();
    },
    methods: {
        fetchSubjects() {
            // Fetch initial subjects data when the component is created
            fetch('https://webstore-rest-api-f979.onrender.com/lessons')
                .then(response => response.json())
                .then(data => {
                    console.log('Data from MongoDB:', data);
                    // Use the data in your front-end application
                    this.subjects = data;
                })
                .catch(error => console.error('Error fetching data:', error))
                .finally(() => {
                    // Once the data is loaded, you can set showProduct to true
                    this.showProduct = true;
                });
        },

        // method to add subjects to cart
        addToCart: function (subject) {
            let itemIndex = this.cart.findIndex((ct) => ct.id === subject.id);
            if (itemIndex === -1) {
                this.cart.push({
                    ...subject,
                    quantity: 1,
                });
            } else {
                this.cart[itemIndex].quantity++;
            }

            // Finds the subject in the subjects array (not filteredSubjects) and update its availability
            const subjectIndex = this.subjects.findIndex((s) => s.id === subject.id);
            if (subjectIndex !== -1) {
                this.subjects[subjectIndex].availableInventory--;
            }
        },

        // Function to handle sorting based on the selected category and order
        sortSubject: function () {
            if (this.sortCategory && this.sortOrder) {
                if (this.sortCategory === "Title") {
                    // Sort subjects by title
                    this.subjects.sort((a, b) => {
                        if (this.sortOrder === "ascending") {
                            return a.title.localeCompare(b.title);
                        } else {
                            return b.title.localeCompare(a.title);
                        }
                    });
                } else if (this.sortCategory === "Location") {
                    // Sort subjects by location
                    this.subjects.sort((a, b) => {
                        if (this.sortOrder === "ascending") {
                            return a.location.localeCompare(b.location);
                        } else {
                            return b.location.localeCompare(a.location);
                        }
                    });
                } else if (this.sortCategory === "Availability") {
                    // Sort subjects by availability
                    if (this.sortOrder === "ascending") {
                        this.subjects.sort(
                            (a, b) => a.availableInventory - b.availableInventory
                        );
                    } else {
                        this.subjects.sort(
                            (a, b) => b.availableInventory - a.availableInventory
                        );
                    }
                } else if (this.sortCategory === "Price") {
                    // Sort subjects by price
                    if (this.sortOrder === "ascending") {
                        this.subjects.sort((a, b) => a.price - b.price);
                    } else {
                        this.subjects.sort((a, b) => b.price - a.price);
                    }
                }
            }
        },

        // Method to show Cart page 
        showCart() {
            if (this.cartItemCount == 0) {
                this.showProduct = true;
            } else {
                this.showProduct = this.showProduct ? false : true;
            }
        },

        resetShowProduct() {
            // Reset the sorting options to default
            this.sortCategory = null;
            this.sortOrder = null;

            // Fetch the original data from MongoDB
            fetch('https://webstore-rest-api-f979.onrender.com/lessons')
                .then(response => response.json())
                .then(data => {
                    console.log('Data from MongoDB:', data);
                    // Use the data in your front-end application
                    this.subjects = data;
                })
                .catch(error => console.error('Error fetching data:', error));
        },

        // Remove Cart items
        removeCartItem: function (item) {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                // Remove the item from the cart when the quantity reaches zero
                this.cart.splice(this.cart.indexOf(item), 1);
            }

            // Find the subject in the subjects array and increase its availability
            const subjectIndex = this.subjects.findIndex(
                (subject) => subject.id === item.id
            );
            if (subjectIndex !== -1) {
                this.subjects[subjectIndex].availableInventory++;
            }
        },

        checkInputs() {
            const namePattern = /^[a-zA-Z\s]+$/;
            const phonePattern = /^[0-9]+$/;

            const isNameValid = namePattern.test(this.name);
            const isPhoneValid = phonePattern.test(this.phone) && this.phone.length >= 7 && this.phone.length <= 15;

            this.isNameValid = isNameValid; // Store name validation result
            this.isPhoneValid = isPhoneValid; // Store phone validation result
            this.isCartNotEmpty = this.cart.length > 0; // Check if the cart is not empty

            // Enable checkout if both name and phone are valid and cart is not empty
            this.isCheckoutEnabled = isNameValid && isPhoneValid && this.isCartNotEmpty;
        },

        // Updated checkout method to include lesson quantity updates
        async checkout() {
      if (this.isCheckoutEnabled) {
        const orderData = {
          name: this.name,
          phoneNumber: this.phone,
          lessons: this.cart,
        };
    
        try {
          const orderResponse = await fetch('https://webstore-rest-api-f979.onrender.com/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
          });
    
          if (!orderResponse.ok) {
            throw new Error('Failed to submit order');
          }

          // Call the function to update lesson quantities
          await this.updateStock();
    
          console.log('Order submitted successfully!');
          this.confirmationText = 'Order submitted successfully!';
          this.orderSubmitted = true;
          this.resetForm();
    
        } catch (error) {
          console.error('Error submitting order:', error.message);
          this.confirmationText = 'Error submitting order. Please try again.';
          this.orderSubmitted = true;
        }
      }
    },
    
    async updateStock() {
      try {
        const response = await fetch('https://webstore-rest-api-f979.onrender.com/updateLessons', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.cart),
        });
    
        if (!response.ok) {
          throw new Error('Failed to update lesson quantities');
        }
    
        console.log('Lesson quantities updated successfully!');
      } catch (error) {
        console.error('Error updating lesson quantities:', error.message);
        // Handle error as needed
      }
    },
    
    resetForm() {
      this.name = '';
      this.phone = '';
      this.cart = [];
      this.isCheckoutEnabled = false;
      this.showProduct = true;
    },

        performSearch() {
            // Perform search on the server
            fetch(`https://webstore-rest-api-f979.onrender.com/search?q=${this.searchKeyword}`)
                .then(response => response.json())
                .then(data => {
                    console.log('Search results:', data);
                    this.subjects = data; // Update the search results
                })
                .catch(error => console.error('Error fetching data:', error))
                .finally(() => {
                    // Once the data is loaded, you can set showProduct to true
                    this.showProduct = true;
                });
        },
    },

    computed: {

        // Counter for cart item
        cartItemCount: function () {
            let totalCount = 0;

            for (const item of this.cart) {
                totalCount += item.quantity;
            }

            return totalCount || "";
        },

        // Function to disable Cart button if no item is added to the cart
        canAddToCart: function () {
            return function (subject) {
                return subject.availableInventory > 0;
            };
        },

        currentSubjects: function () {
            return this.searchKeyword ? this.searchResults : this.subjects;
        },

    },
});
