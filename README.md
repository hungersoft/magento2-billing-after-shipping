![Hungersoft.com](https://www.hungersoft.com/skin/front/custom/images/logo.png)

#  Billing After Shipping [M2]
**hs/module-billing-after-shipping**

This extension moves the billing address form from the payment step to below the shipping address form.

## Installation

```sh
composer config repositories.hs-module-all vcs https://github.com/hungersoft/module-all.git
composer config repositories.hs-module-billing-after-shipping vcs https://github.com/hungersoft/magento2-billing-after-shipping.git
composer require hs/module-billing-after-shipping:dev-master

php bin/magento module:enable HS_All HS_Checkout
php bin/magento setup:upgrade
```

## Support

Feel free to contact [Hungersoft](https://www.hungersoft.com/contact) at support@hungersoft.com if you are facing any issues with this extension. Reviews, suggestions and feedback will be greatly appreciated.
