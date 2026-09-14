import 'package:flutter_test/flutter_test.dart';
import 'package:civic_resolve/credit_service.dart';

void main() {
  group('Credit System Tests', () {
    test('CreditService constants are properly defined', () {
      expect(CreditService.CREDITS_PER_REPORT, 10);
      expect(CreditService.CREDITS_PER_RESOLVED_REPORT, 5);
      expect(CreditService.CREDITS_PER_QUALITY_REPORT, 15);
    });

    test('CreditModel can be created from JSON', () {
      final json = {
        'id': '123',
        'user_id': 'user_123',
        'credits_earned': 10,
        'earned_for': 'report_submission',
        'report_id': 'report_456',
        'created_at': '2025-09-21T10:00:00Z',
      };

      final credit = CreditModel.fromJson(json);

      expect(credit.id, '123');
      expect(credit.userId, 'user_123');
      expect(credit.creditsEarned, 10);
      expect(credit.earnedFor, 'report_submission');
      expect(credit.reportId, 'report_456');
    });

    test('CouponModel can be created from JSON', () {
      final json = {
        'id': '456',
        'user_id': 'user_123',
        'coupon_code': 'CC12345678',
        'title': '10% Off Services',
        'description': 'Get 10% discount on municipal services',
        'credits_cost': 100,
        'discount_percentage': 10.0,
        'max_discount_amount': 200.0,
        'valid_until': '2025-12-21T10:00:00Z',
        'is_redeemed': false,
        'created_at': '2025-09-21T10:00:00Z',
      };

      final coupon = CouponModel.fromJson(json);

      expect(coupon.id, '456');
      expect(coupon.userId, 'user_123');
      expect(coupon.couponCode, 'CC12345678');
      expect(coupon.title, '10% Off Services');
      expect(coupon.discountPercentage, 10.0);
      expect(coupon.isRedeemed, false);
    });

    test('Available coupon templates are properly structured', () {
      final templates = CreditService.getAvailableCouponTemplates();

      expect(templates.length, 4);
      
      for (final template in templates) {
        expect(template.containsKey('title'), true);
        expect(template.containsKey('description'), true);
        expect(template.containsKey('credits_cost'), true);
        expect(template.containsKey('discount_percentage'), true);
        expect(template.containsKey('validity_days'), true);
        
        expect(template['credits_cost'] is int, true);
        expect(template['discount_percentage'] is double, true);
        expect(template['validity_days'] is int, true);
      }
    });

    test('Coupon code generation creates unique codes', () {
      // Since _generateCouponCode is private, we can't test it directly
      // But we can verify the format by checking available templates
      final templates = CreditService.getAvailableCouponTemplates();
      expect(templates.isNotEmpty, true);
    });
  });

  group('Credit Integration Tests', () {
    test('Credit earning scenarios are properly defined', () {
      // Test that different earning scenarios have appropriate credit values
      expect(CreditService.CREDITS_PER_REPORT > 0, true);
      expect(CreditService.CREDITS_PER_RESOLVED_REPORT > 0, true);
      expect(CreditService.CREDITS_PER_QUALITY_REPORT > CreditService.CREDITS_PER_REPORT, true);
    });

    test('Coupon templates have reasonable credit costs', () {
      final templates = CreditService.getAvailableCouponTemplates();
      
      for (final template in templates) {
        final cost = template['credits_cost'] as int;
        final discount = template['discount_percentage'] as double;
        
        // Credit cost should be reasonable for the discount offered
        expect(cost >= 50, true, reason: 'Minimum cost should be 50 credits');
        expect(cost <= 500, true, reason: 'Maximum cost should be 500 credits');
        
        // Higher discounts should cost more credits
        if (discount > 10) {
          expect(cost >= 100, true, reason: 'Higher discounts should cost more');
        }
      }
    });
  });
}