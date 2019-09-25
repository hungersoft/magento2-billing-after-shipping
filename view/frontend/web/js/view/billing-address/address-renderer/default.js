define([
    'jquery',
    'ko',
    'uiComponent',
    'Magento_Checkout/js/action/select-billing-address',
    'Magento_Checkout/js/model/quote',
    'HS_Checkout/js/model/billing-address/form-popup-state',
    'Magento_Checkout/js/checkout-data',
    'Magento_Customer/js/customer-data'
], function ($, ko, Component, selectBillingAddressAction, quote, formPopUpState, checkoutData, customerData) {
    'use strict';

    var countryData = customerData.get('directory-data');

    return Component.extend({
        defaults: {
            template: 'HS_Checkout/billing-address/address-renderer/default'
        },

        /** @inheritdoc */
        initObservable: function () {
            this._super();
            this.isSelected = ko.computed(function () {
                var isSelected = false,
                    billingAddress = quote.billingAddress();

                if (billingAddress) {
                    isSelected = billingAddress.getKey() == this.address().getKey(); //eslint-disable-line eqeqeq
                }

                return isSelected;
            }, this);

            return this;
        },

        /**
         * @param {String} countryId
         * @return {String}
         */
        getCountryName: function (countryId) {
            return countryData()[countryId] != undefined ? countryData()[countryId].name : ''; //eslint-disable-line
        },

        /** Set selected customer shipping address  */
        selectAddress: function () {
            selectBillingAddressAction(this.address());
            checkoutData.setSelectedBillingAddress(this.address().getKey());
        },

        /**
         * Edit address.
         */
        editAddress: function () {
            formPopUpState.isVisible(true);
            this.showPopup();

        },

        /**
         * Show popup.
         */
        showPopup: function () {
            $('[data-open-modal="opc-new-billing-address"]').trigger('click');
        }
    });
});
