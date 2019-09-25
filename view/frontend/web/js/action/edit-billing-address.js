define([
    'ko',
    'Magento_Customer/js/model/address-list'
], function (ko, addressList) {
    'use strict';

    return function (address) {
        addressList().some(function (currentAddress, index, addresses) {
            if (currentAddress.getKey() === address.getKey()) {
                addressList.replace(currentAddress, address);
            }
        });

        addressList.valueHasMutated();

        return address;
    };
});
