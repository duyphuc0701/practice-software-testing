import {Component, inject, OnInit} from '@angular/core';
import {CartService} from "../../_services/cart.service";
import {CustomerAccountService} from "../../shared/customer-account.service";
import {ToastrService} from "ngx-toastr";
import {TranslocoDirective} from "@jsverse/transloco";
import {DecimalPipe, NgClass} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ArchwizardModule} from "@y3krulez/angular-archwizard";

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  imports: [
    TranslocoDirective,
    NgClass,
    DecimalPipe,
    FaIconComponent,
    ArchwizardModule
  ],
  styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly toastr = inject(ToastrService);
  private readonly customerAccountService = inject(CustomerAccountService);

  cart: any;
  isLoggedIn: boolean = false;
  discount: number = 0;
  ecoDiscount: number = 0;
  total: number = 0;
  subtotal: number = 0;

  ngOnInit(): void {
    this.fetchCartItems();
    this.isLoggedIn = this.customerAccountService.isLoggedIn();
  }

  fetchCartItems(): void {
    this.cartService.getCart().subscribe(cart => {
      this.cart = cart;
      this.total = this.calculateTotal(cart.cart_items);
      this.subtotal = this.total;
      this.discount = this.calculateDiscount(cart.additional_discount_percentage);
      this.ecoDiscount = this.calculateEcoDiscount(cart.cart_items);
    });
  }

  updateQuantity(event: Event, item: any): void {
    const target = event.target as HTMLInputElement;
    const quantity = Math.max(1, parseInt(target.value, 10));

    if (quantity >= 1) {
      this.cartService.replaceQuantity(item.product.id, quantity).subscribe(() => {
        this.fetchCartItems();
        this.toastr.success('Product quantity updated.', null, {progressBar: true});
      }, (response) => {
        this.toastr.error(response.error.message, null, {progressBar: true});
      });
    }
  }

  delete(id: number): void {
    this.cartService.deleteItem(id).subscribe(() => {
      this.fetchCartItems();
      this.toastr.success('Product deleted.', null, {progressBar: true});
    });
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((sum, cartItem) => {
      const quantity = cartItem.quantity || 0;
      const price = cartItem.discount_percentage ? cartItem.discounted_price : cartItem.product?.price || 0;
      return sum + (quantity * price);
    }, 0);
  }

  private calculateDiscount(percentage: number): number {
    // Calculate the discount amount
    const discountAmount = this.total * (percentage / 100);

    // Calculate the discounted price
    this.total = this.total - discountAmount;

    return discountAmount;
  }

  private calculateEcoDiscount(items: any[]): number {
    // Count eco-friendly products (CO2 rating A or B)
    let ecoFriendlyCount = 0;
    let totalProductCount = 0;

    items.forEach(cartItem => {
      const quantity = cartItem.quantity || 0;
      totalProductCount += quantity;

      const co2Rating = cartItem.product?.co2_rating?.toUpperCase();
      if (co2Rating === 'A' || co2Rating === 'B') {
        ecoFriendlyCount += quantity;
      }
    });

    // Apply 5% eco discount if more than 50% of products are eco-friendly
    if (totalProductCount > 0 && (ecoFriendlyCount / totalProductCount) > 0.5) {
      const ecoDiscountAmount = this.total * 0.05;
      this.total = this.total - ecoDiscountAmount;
      return ecoDiscountAmount;
    }

    return 0;
  }
}
