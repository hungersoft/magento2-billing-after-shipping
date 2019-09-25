define([
    'jquery',
    'underscore',
    'ko',
    'Magento_Customer/js/model/customer',
    'Magento_Customer/js/model/address-list',
    'Magento_Checkout/js/model/address-converter',
    'Magento_Checkout/js/model/quote',
    'Magento_Checkout/js/action/create-shipping-address',
    'Magento_Checkout/js/action/select-shipping-address',
    'Magento_Checkout/js/action/create-billing-address',
    'Magento_Checkout/js/action/select-billing-address',
    'Magento_Checkout/js/model/shipping-rates-validator',
    'Magento_Checkout/js/model/shipping-address/form-popup-state',
    'Magento_Checkout/js/model/shipping-service',
    'Magento_Checkout/js/action/select-shipping-method',
    'Magento_Checkout/js/model/shipping-rate-registry',
    'Magento_Checkout/js/action/set-shipping-information',
    'Magento_Checkout/js/model/step-navigator',
    'Magento_Ui/js/modal/modal',
    'Magento_Checkout/js/model/checkout-data-resolver',
    'Magento_Checkout/js/checkout-data',
    'uiRegistry',
    'mage/translate',
    'Magento_Checkout/js/model/shipping-rate-service'
], function (
    $,
    _,
    ko,
    customer,
    addressList,
    addressConverter,
    quote,
    createShippingAddress,
    selectShippingAddress,
    createBillingAddress,
    selectBillingAddress,
    shippingRatesValidator,
    formPopUpState,
    shippingService,
    selectShippingMethodAction,
    rateRegistry,
    setShippingInformationAction,
    stepNavigator,
    modal,
    checkoutDataResolver,
    checkoutData,
    registry,
    $t
) {
    'use strict';

    var popUp = null;

    return function (Component) {
        return Component.extend({
            defaults: {
                template: 'HS_Checkout/shipping',
            },
            isAddressSameAsShipping: ko.observable(true),
            isShowBillingForm: ko.observable(false),

            initChildren: function () {
                this.messageContainer = new Messages();
                this.createMessagesComponent();
                return this;
            },

            createMessagesComponent: function () {
                var messagesComponent = {
                    parent: this.name,
                    name: this.name + '.messages',
                    displayArea: 'messages',
                    component: 'Magento_Ui/js/view/messages',
                    config: {
                        messageContainer: this.messageContainer
                    }
                };

                layout([messagesComponent]);

                return this;
            },

            setShippingInformation: function () {
                if (this.validateShippingInformation()
                    && this.validateBillingInformation()) {
                    setShippingInformationAction().done(function () {
                        stepNavigator.next();
                    });
                }
            },

            /**
             * @return {Boolean}
             */
            validateShippingInformation: function () {
                var shippingAddress,
                    addressData,
                    loginFormSelector = 'form[data-role=email-with-possible-login]',
                    emailValidationResult = customer.isLoggedIn(),
                    field;

                if (!quote.shippingMethod()) {
                    this.errorValidationMessage($t('Please specify a shipping method.'));

                    return false;
                }

                if (!customer.isLoggedIn()) {
                    $(loginFormSelector).validation();
                    emailValidationResult = Boolean($(loginFormSelector + ' input[name=username]').valid());
                }

                if (this.isFormInline) {
                    this.source.set('params.invalid', false);
                    this.triggerShippingDataValidateEvent();

                    if (emailValidationResult &&
                        this.source.get('params.invalid') ||
                        !quote.shippingMethod()['method_code'] ||
                        !quote.shippingMethod()['carrier_code']
                    ) {
                        this.focusInvalid();

                        return false;
                    }

                    shippingAddress = quote.shippingAddress();
                    addressData = addressConverter.formAddressDataToQuoteAddress(
                        this.source.get('shippingAddress')
                    );

                    //Copy form data to quote shipping address object
                    for (field in addressData) {
                        if (addressData.hasOwnProperty(field) &&  //eslint-disable-line max-depth
                            shippingAddress.hasOwnProperty(field) &&
                            typeof addressData[field] != 'function' &&
                            _.isEqual(shippingAddress[field], addressData[field])
                        ) {
                            shippingAddress[field] = addressData[field];
                        } else if (typeof addressData[field] != 'function' &&
                            !_.isEqual(shippingAddress[field], addressData[field])) {
                            shippingAddress = addressData;
                            break;
                        }
                    }

                    if (customer.isLoggedIn()) {
                        shippingAddress['save_in_address_book'] = 1;
                    }
                    selectShippingAddress(shippingAddress);
                }

                if (!emailValidationResult) {
                    $(loginFormSelector + ' input[name=username]').focus();

                    return false;
                }

                return true;
            },

            validateBillingInformation: function () {
                var addressData, newBillingAddress;

                if ($('[name="billing-address-same-as-shipping"]').is(":checked")) {
                    if (this.isFormInline) {
                        var shippingAddress = quote.shippingAddress();
                        addressData = addressConverter.formAddressDataToQuoteAddress(
                            this.source.get('shippingAddress')
                        );
                        //Copy form data to quote shipping address object
                        for (var field in addressData) {
                            if (addressData.hasOwnProperty(field) &&
                                shippingAddress.hasOwnProperty(field) &&
                                typeof addressData[field] !== 'function' &&
                                _.isEqual(shippingAddress[field], addressData[field])
                            ) {
                                shippingAddress[field] = addressData[field];
                            } else if (typeof addressData[field] !== 'function' &&
                                !_.isEqual(shippingAddress[field], addressData[field])) {
                                shippingAddress = addressData;
                                break;
                            }
                        }

                        if (customer.isLoggedIn()) {
                            shippingAddress.save_in_address_book = 1;
                        }
                        newBillingAddress = createBillingAddress(shippingAddress);
                        selectBillingAddress(newBillingAddress);
                    } else {
                        var billingAddress = quote.shippingAddress();
                        selectBillingAddress(billingAddress);
                    }

                    return true;
                }

                var selectedAddress = quote.billingAddress();
                if (selectedAddress) {
                    if (selectedAddress.customerAddressId) {
                        return addressList.some(function (address) {
                            if (selectedAddress.customerAddressId === address.customerAddressId) {
                                selectBillingAddress(address);
                                return true;
                            }
                            return false;
                        });
                    } else if (selectedAddress.getType() === 'new-customer-address' || selectedAddress.getType() === 'new-billing-address') {
                        return true;
                    }
                }

                this.source.set('params.invalid', false);
                this.source.trigger('billingAddress.data.validate');

                if (this.source.get('billingAddress.custom_attributes')) {
                    this.source.trigger('billingAddress.custom_attributes.data.validate');
                }

                if (this.source.get('params.invalid')) {
                    return false;
                }

                addressData = this.source.get('billingAddress');

                if ($('#billing-save-in-address-book').is(":checked")) {
                    addressData.save_in_address_book = 1;
                }
                newBillingAddress = createBillingAddress(addressData);

                selectBillingAddress(newBillingAddress);

                return true;
            },

            /**
             * @return {Boolean}
             */
            useShippingAddress: function () {
                if (this.isAddressSameAsShipping()) {
                    this.isShowBillingForm(false);
                } else {
                    this.isShowBillingForm(true);
                }
                return true;
            },

        });
    }
});
