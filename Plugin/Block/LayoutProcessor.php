<?php

namespace HS\Checkout\Plugin\Block;

use Magento\Customer\Model\AttributeMetadataDataProvider;
use Magento\Ui\Component\Form\AttributeMapper;
use Magento\Checkout\Block\Checkout\AttributeMerger;
use Magento\Checkout\Model\Session as CheckoutSession;

class LayoutProcessor
{
    /**
     * @var AttributeMetadataDataProvider
     */
    public $attributeMetadataDataProvider;

    /**
     * @var AttributeMapper
     */
    public $attributeMapper;

    /**
     * @var AttributeMerger
     */
    public $merger;

    /**
     * @var CheckoutSession
     */
    public $checkoutSession;

    /**
     * @var null
     */
    public $quote = null;

    /**
     * LayoutProcessor constructor.
     *
     * @param AttributeMetadataDataProvider $attributeMetadataDataProvider
     * @param AttributeMapper               $attributeMapper
     * @param AttributeMerger               $merger
     * @param CheckoutSession               $checkoutSession
     */
    public function __construct(
        AttributeMetadataDataProvider $attributeMetadataDataProvider,
        AttributeMapper $attributeMapper,
        AttributeMerger $merger,
        CheckoutSession $checkoutSession
    ) {
        $this->attributeMetadataDataProvider = $attributeMetadataDataProvider;
        $this->attributeMapper = $attributeMapper;
        $this->merger = $merger;
        $this->checkoutSession = $checkoutSession;
    }

    /**
     * @param \Magento\Checkout\Block\Checkout\LayoutProcessor $subject
     * @param array                                            $jsLayout
     *
     * @return array
     */
    public function aroundProcess(
        \Magento\Checkout\Block\Checkout\LayoutProcessor $subject,
        \Closure $proceed,
        array $jsLayout
    ) {
        $jsLayoutResult = $proceed($jsLayout);

        if ($this->getQuote()->isVirtual()) {
            return $jsLayoutResult;
        }

        if (isset($jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']['children']
        ['shippingAddress']['children']['shipping-address-fieldset'])) {
            $jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']
        ['children']['shippingAddress']['children']['shipping-address-fieldset']['children']['street']['children'][0]['placeholder'] = __('Street Address');
            $jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']
        ['children']['shippingAddress']['children']['shipping-address-fieldset']['children']['street']['children'][1]['placeholder'] = __('Street line 2');

            $jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']
        ['children']['shippingAddress']['children']['billing-address']['children']['form-fields']['children']['street']['children'][0]['placeholder'] = __('Street Address');
            $jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']
        ['children']['shippingAddress']['children']['billing-address']['children']['form-fields']['children']['street']['children'][1]['placeholder'] = __('Street line 2');
        }

        $elements = $this->getAddressAttributes();

        $jsLayoutResult['components']['checkout']['children']['steps']['children']['shipping-step']
    ['children']['shippingAddress']['children']['billingAddress']['children']['address-fieldset'] = $this->getCustomBillingAddressComponent($elements);

        if (isset($jsLayoutResult['components']['checkout']['children']['steps']['children']['billing-step']['children']
        ['payment']['children']['afterMethods']['children']['billing-address-form'])) {
            unset($jsLayoutResult['components']['checkout']['children']['steps']['children']['billing-step']['children']
            ['payment']['children']['afterMethods']['children']['billing-address-form']);
        };

        if ($billingAddressForms = $jsLayoutResult['components']['checkout']['children']['steps']['children']['billing-step']['children']
    ['payment']['children']['payments-list']['children']) {
            foreach ($billingAddressForms as $billingAddressFormsKey => $billingAddressForm) {
                if ($billingAddressFormsKey != 'before-place-order') {
                    unset($jsLayoutResult['components']['checkout']['children']['steps']['children']['billing-step']['children']
                    ['payment']['children']['payments-list']['children'][$billingAddressFormsKey]);
                }
            }
        }

        return $jsLayoutResult;
    }

    /**
     * Get Quote.
     *
     * @return \Magento\Quote\Model\Quote|null
     */
    public function getQuote()
    {
        if (null === $this->quote) {
            $this->quote = $this->checkoutSession->getQuote();
        }

        return $this->quote;
    }

    /**
     * Get all visible address attribute.
     *
     * @return array
     */
    private function getAddressAttributes()
    {
        /** @var \Magento\Eav\Api\Data\AttributeInterface[] $attributes */
        $attributes = $this->attributeMetadataDataProvider->loadAttributesCollection(
            'customer_address',
            'customer_register_address'
        );

        $elements = [];
        foreach ($attributes as $attribute) {
            $code = $attribute->getAttributeCode();
            if ($attribute->getIsUserDefined()) {
                continue;
            }
            $elements[$code] = $this->attributeMapper->map($attribute);
            if (isset($elements[$code]['label'])) {
                $label = $elements[$code]['label'];
                $elements[$code]['label'] = __($label);
            }
        }

        return $elements;
    }

    /**
     * Prepare billing address field for shipping step for physical product.
     *
     * @param $elements
     *
     * @return array
     */
    public function getCustomBillingAddressComponent($elements)
    {
        $providerName = 'checkoutProvider';

        $components = [
            'component' => 'uiComponent',
            'displayArea' => 'additional-fieldsets',
            'children' => $this->merger->merge(
                $elements,
                $providerName,
                'billingAddress',
                [
                    'country_id' => [
                        'sortOrder' => 115,
                    ],
                    'region' => [
                        'visible' => false,
                    ],
                    'region_id' => [
                        'component' => 'Magento_Ui/js/form/element/region',
                        'config' => [
                            'template' => 'ui/form/field',
                            'elementTmpl' => 'ui/form/element/select',
                            'customEntry' => 'billingAddress.region',
                        ],
                        'validation' => [
                            'required-entry' => true,
                        ],
                        'filterBy' => [
                            'target' => '${ $.provider }:${ $.parentScope }.country_id',
                            'field' => 'country_id',
                        ],
                    ],
                    'postcode' => [
                        'component' => 'Magento_Ui/js/form/element/post-code',
                        'validation' => [
                            'required-entry' => true,
                        ],
                    ],
                    'company' => [
                        'validation' => [
                            'min_text_length' => 0,
                        ],
                    ],
                    'fax' => [
                        'validation' => [
                            'min_text_length' => 0,
                        ],
                    ],
                    'telephone' => [
                        'config' => [
                            'tooltip' => [
                                'description' => __('For delivery questions.'),
                            ],
                        ],
                    ],
                ]
            ),
        ];

        return $components;
    }
}
