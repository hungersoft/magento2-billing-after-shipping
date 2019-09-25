define([
    'jquery',
    'ko',
    'underscore',
    'matchMedia',
    'mage/utils/objects',
    'Magento_Ui/js/form/form',
    'Magento_Customer/js/model/customer',
    'Magento_Customer/js/model/customer/address',
    'Magento_Customer/js/model/address-list',
    'Magento_Checkout/js/model/address-converter',
    'Magento_Checkout/js/model/quote',
    'HS_Checkout/js/model/billing-address/form-popup-state',
    'HS_Checkout/js/action/edit-billing-address',
    'Magento_Checkout/js/action/create-billing-address',
    'Magento_Checkout/js/action/select-billing-address',
    'Magento_Checkout/js/checkout-data',
    'Magento_Checkout/js/model/checkout-data-resolver',
    'Magento_Customer/js/customer-data',
    'Magento_Checkout/js/action/set-billing-address',
    'Magento_Ui/js/modal/modal',
    'Magento_Ui/js/model/messageList',
    'mage/translate',
    'mage/url'
], function (
    $,
    ko,
    _,
    mediaCheck,
    mageUtils,
    Component,
    customer,
    address,
    addressList,
    addressConverter,
    quote,
    formPopUpState,
    editBillingAddress,
    createBillingAddress,
    selectBillingAddress,
    checkoutData,
    checkoutDataResolver,
    customerData,
    setBillingAddressAction,
    modal,
    globalMessageList,
    $t,
    url
) {
    'use strict';

    var popUp = null;

    return Component.extend({
        defaults: {
            template: 'HS_Checkout/billing',
            billingFormTemplate: 'HS_Checkout/billing-address/form'
        },
        visible: ko.observable(!quote.isVirtual()),
        errorValidationMessage: ko.observable(false),
        isCustomerLoggedIn: customer.isLoggedIn,
        isFormPopUpVisible: formPopUpState.isVisible,
        isFormInline: addressList().length === 0,
        isNewAddressAdded: ko.observable(false),
        saveInAddressBook: 1,
        quoteIsVirtual: quote.isVirtual(),

        /**
         * @return {exports}
         */

        /**
         * Init component
         */
        initialize: function () {
            this._super();
            quote.paymentMethod.subscribe(function () {
                checkoutDataResolver.resolveBillingAddress();
            }, this);
        },

        /**
         * @return {exports.initObservable}
         */
        initObservable: function () {
            var self = this,
                hasNewAddress;

            this._super()
                .observe({
                    selectedAddress: null,
                    isAddressFormVisible: true,
                    isAddressSameAsShipping: false,
                    isAddressFormListVisible: false,
                    saveInAddressBook: 1
                });

            quote.billingAddress.subscribe(function (newAddress) {
                if (quote.isVirtual()) {
                    this.isAddressSameAsShipping(false);
                } else {
                    this.isAddressSameAsShipping(
                        newAddress != null && quote.shippingAddress()
                        && newAddress.getCacheKey() === quote.shippingAddress().getCacheKey() //eslint-disable-line eqeqeq
                    );
                }

                if (newAddress != null && newAddress.saveInAddressBook !== undefined) {
                    this.saveInAddressBook(newAddress.saveInAddressBook);
                } else {
                    this.saveInAddressBook(1);
                }
            }, this);

            checkoutDataResolver.resolveBillingAddress();

            hasNewAddress = addressList.some(function (address) {
                return address.getType() === 'new-customer-address' || address.getType() === 'new-billing-address'; //eslint-disable-line eqeqeq
            });

            this.isNewAddressAdded(hasNewAddress);

            this.isFormPopUpVisible.subscribe(function (value) {
                if (value) {
                    self.getPopUp().openModal();
                }
            });

            return this;
        },

        /**
         * Navigator change hash handler.
         *
         * @param {Object} step - navigation step
         */
        navigate: function (step) {
            step && step.isVisible(true);
        },

        /**
         * @return {*}
         */
        getPopUp: function () {
            var self = this,
                buttons;

            if (!popUp) {
                buttons = this.popUpForm.options.buttons;
                this.popUpForm.options.buttons = [
                    {
                        text: buttons.save.text ? buttons.save.text : $t('Save Address'),
                        class: buttons.save.class ? buttons.save.class : 'action primary action-save-address',
                        click: self.saveNewAddress.bind(self)
                    },
                    {
                        text: buttons.cancel.text ? buttons.cancel.text : $t('Cancel'),
                        class: buttons.cancel.class ? buttons.cancel.class : 'action secondary action-hide-popup',

                        /** @inheritdoc */
                        click: this.onClosePopUp.bind(this)
                    }
                ];

                /** @inheritdoc */
                this.popUpForm.options.closed = function () {
                    self.isFormPopUpVisible(false);
                };

                this.popUpForm.options.modalCloseBtnHandler = this.onClosePopUp.bind(this);
                this.popUpForm.options.keyEventHandlers = {
                    escapeKey: this.onClosePopUp.bind(this)
                };

                /** @inheritdoc */
                this.popUpForm.options.opened = function () {
                    // Store temporary address for revert action in case when user click cancel action
                    self.temporaryAddress = $.extend(true, {}, checkoutData.getBillingAddressFromData());
                };
                popUp = modal(this.popUpForm.options, $(this.popUpForm.element));
            }

            return popUp;
        },

        /**
         * Revert address and close modal.
         */
        onClosePopUp: function () {
            checkoutData.getBillingAddressFromData($.extend(true, {}, this.temporaryAddress));
            this.getPopUp().closeModal();
        },

        /**
         * Show address form popup
         */
        showFormPopUp: function () {
            this.isFormPopUpVisible(true);
        },

        /**
         * Save new billing address
         */
        saveNewAddress: function () {
            var addressData,
                newBillingAddress;

            this.source.set('params.invalid', false);
            this.triggerBillingDataValidateEvent();

            if (!this.source.get('params.invalid')) {
                addressData = this.source.get('billingAddress');
                // if user clicked the checkbox, its value is true or false. Need to convert.
                addressData['save_in_address_book'] = this.saveInAddressBook ? 1 : 0;

                // New address must be selected as a billing address
                newBillingAddress = createBillingAddress(addressData);
                selectBillingAddress(newBillingAddress);
                checkoutData.setSelectedBillingAddress(newBillingAddress.getKey());
                checkoutData.setNewCustomerBillingAddress($.extend(true, {}, addressData));
                this.getPopUp().closeModal();
                this.isNewAddressAdded(true);
            }
        },

        /**
         * Trigger Billing data Validate Event.
         */
        triggerBillingDataValidateEvent: function () {
            this.source.trigger('billingAddress.data.validate');

            if (this.source.get('billingAddress.custom_attributes')) {
                this.source.trigger('billingAddress.custom_attributes.data.validate');
            }
        },
    });
});
