<?php

/*
 * This file is part of the Symfony package.
 *
 * (c) Fabien Potencier <fabien@symfony.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Symfony\UX\Autocomplete\Tests\Functional;

use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\UX\Autocomplete\Tests\Fixtures\Factory\CategoryFactory;
use Zenstruck\Browser\Test\HasBrowser;
use Zenstruck\Foundry\Test\Factories;
use Zenstruck\Foundry\Test\ResetDatabase;

// tests CategoryAutocompleteType
class AutocompleteFormRenderingTest extends KernelTestCase
{
    use Factories;
    use HasBrowser;
    use ResetDatabase;

    public function testFieldsRenderWithStimulusController()
    {
        $this->browser()
            ->throwExceptions()
            ->get('/test-form')
            ->assertElementAttributeContains('#product_category_autocomplete', 'data-controller', 'custom-autocomplete symfony--ux-autocomplete--autocomplete')
            ->assertElementAttributeContains('#product_category_autocomplete', 'data-symfony--ux-autocomplete--autocomplete-url-value', '/test/autocomplete/category_autocomplete_type')

            ->assertElementAttributeContains('#product_portionSize', 'data-controller', 'symfony--ux-autocomplete--autocomplete')
            ->assertElementAttributeContains('#product_tags', 'data-controller', 'symfony--ux-autocomplete--autocomplete')
            ->assertElementAttributeContains('#product_tags', 'data-symfony--ux-autocomplete--autocomplete-tom-select-options-value', 'createOnBlur')
        ;
    }

    public function testCategoryFieldSubmitsCorrectly()
    {
        $firstCat = CategoryFactory::createOne(['name' => 'First cat']);
        CategoryFactory::createOne(['name' => 'in space']);
        CategoryFactory::createOne(['name' => 'ate pizza']);

        $this->browser()
            ->throwExceptions()
            ->get('/test-form')
            // the field renders empty (but the placeholder is there)
            ->assertElementCount('#product_category_autocomplete option', 1)
            ->assertNotContains('First cat')
            ->post('/test-form', [
                'body' => [
                    'product' => ['category' => ['autocomplete' => $firstCat->getId()]],
                ],
            ])
            // the one option + placeholder now shows up
            ->assertElementCount('#product_category_autocomplete option', 2)
            ->assertContains('First cat')
        ;
    }
}
