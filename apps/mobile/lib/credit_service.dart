import 'package:supabase_flutter/supabase_flutter.dart';

class CreditModel {
  final String id;
  final String userId;
  final int creditsEarned;
  final String earnedFor; // 'report_submission', 'report_resolved', etc.
  final String? reportId;
  final DateTime createdAt;

  CreditModel({
    required this.id,
    required this.userId,
    required this.creditsEarned,
    required this.earnedFor,
    this.reportId,
    required this.createdAt,
  });

  factory CreditModel.fromJson(Map<String, dynamic> json) {
    return CreditModel(
      id: json['id'].toString(),
      userId: json['user_id'].toString(),
      creditsEarned: json['credits_earned'] ?? 0,
      earnedFor: json['earned_for'] ?? '',
      reportId: json['report_id']?.toString(),
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'credits_earned': creditsEarned,
      'earned_for': earnedFor,
      'report_id': reportId,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class CouponModel {
  final String id;
  final String userId;
  final String couponCode;
  final String title;
  final String description;
  final int creditsCost;
  final double discountPercentage;
  final double? maxDiscountAmount;
  final DateTime validUntil;
  final bool isRedeemed;
  final DateTime? redeemedAt;
  final DateTime createdAt;

  CouponModel({
    required this.id,
    required this.userId,
    required this.couponCode,
    required this.title,
    required this.description,
    required this.creditsCost,
    required this.discountPercentage,
    this.maxDiscountAmount,
    required this.validUntil,
    required this.isRedeemed,
    this.redeemedAt,
    required this.createdAt,
  });

  factory CouponModel.fromJson(Map<String, dynamic> json) {
    return CouponModel(
      id: json['id'].toString(),
      userId: json['user_id'].toString(),
      couponCode: json['coupon_code'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      creditsCost: json['credits_cost'] ?? 0,
      discountPercentage: (json['discount_percentage'] ?? 0.0).toDouble(),
      maxDiscountAmount: json['max_discount_amount']?.toDouble(),
      validUntil: DateTime.parse(json['valid_until']),
      isRedeemed: json['is_redeemed'] ?? false,
      redeemedAt: json['redeemed_at'] != null ? DateTime.parse(json['redeemed_at']) : null,
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'coupon_code': couponCode,
      'title': title,
      'description': description,
      'credits_cost': creditsCost,
      'discount_percentage': discountPercentage,
      'max_discount_amount': maxDiscountAmount,
      'valid_until': validUntil.toIso8601String(),
      'is_redeemed': isRedeemed,
      'redeemed_at': redeemedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class CreditService {
  static final SupabaseClient _supabase = Supabase.instance.client;

  // Credit earning constants
  static const int creditsPerReport = 10;
  static const int creditsPerResolvedReport = 5;
  static const int creditsPerQualityReport = 15; // For high-quality reports

  /// Award credits to user for a specific action
  static Future<bool> awardCredits({
    required String userId,
    required int credits,
    required String earnedFor,
    String? reportId,
  }) async {
    try {
      final creditData = {
        'user_id': userId,
        'credits_earned': credits,
        'earned_for': earnedFor,
        'report_id': reportId,
        'created_at': DateTime.now().toIso8601String(),
      };

      await _supabase.from('user_credits').insert(creditData);

      // Update user's total credits
      await _updateUserTotalCredits(userId);
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Award credits specifically for report submission
  static Future<bool> awardCreditsForReport(String userId, String reportId) async {
    return await awardCredits(
      userId: userId,
      credits: creditsPerReport,
      earnedFor: 'report_submission',
      reportId: reportId,
    );
  }

  /// Award credits when a user's report gets resolved
  static Future<bool> awardCreditsForResolvedReport(String userId, String reportId) async {
    return await awardCredits(
      userId: userId,
      credits: creditsPerResolvedReport,
      earnedFor: 'report_resolved',
      reportId: reportId,
    );
  }

  /// Get user's total credits
  static Future<int> getUserTotalCredits(String userId) async {
    try {
      final response = await _supabase
          .from('user_profiles')
          .select('total_credits')
          .eq('user_id', userId)
          .single();
      
      return response['total_credits'] ?? 0;
    } catch (e) {
      return 0;
    }
  }

  /// Get user's credit history
  static Future<List<CreditModel>> getUserCreditHistory(String userId) async {
    try {
      final response = await _supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return response.map((data) => CreditModel.fromJson(data)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Spend credits for plant purchases or other uses
  static Future<bool> spendCredits(String userId, int creditsToSpend, String reason) async {
    try {
      final currentCredits = await getUserTotalCredits(userId);
      
      if (currentCredits < creditsToSpend) {
        return false; // Insufficient credits
      }

      // Record the credit spending as a negative entry
      final spendingData = {
        'user_id': userId,
        'credits_earned': -creditsToSpend, // Negative to indicate spending
        'earned_for': reason,
        'created_at': DateTime.now().toIso8601String(),
      };

      await _supabase
          .from('user_credits')
          .insert(spendingData);

      // Update user's total credits
      await _updateUserTotalCredits(userId);

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Update user's total credits by summing all credit transactions
  static Future<void> _updateUserTotalCredits(String userId) async {
    try {
      // Calculate total credits earned
      final creditsResponse = await _supabase
          .from('user_credits')
          .select('credits_earned')
          .eq('user_id', userId);

      int totalCreditsEarned = 0;
      for (final credit in creditsResponse) {
        totalCreditsEarned += credit['credits_earned'] as int;
      }

      // Calculate total credits spent on coupons
      final couponsResponse = await _supabase
          .from('user_coupons')
          .select('credits_cost')
          .eq('user_id', userId);

      int totalCreditsSpent = 0;
      for (final coupon in couponsResponse) {
        totalCreditsSpent += coupon['credits_cost'] as int;
      }

      final totalCredits = totalCreditsEarned - totalCreditsSpent;

      // Upsert user profile with total credits
      await _supabase
          .from('user_profiles')
          .upsert({
            'user_id': userId,
            'total_credits': totalCredits,
            'updated_at': DateTime.now().toIso8601String(),
          });
    } catch (e) {
      // Handle error silently for now
    }
  }

  /// Get available coupon templates
  static List<Map<String, dynamic>> getAvailableCouponTemplates() {
    return [
      {
        'title': '5% Off Local Services',
        'description': 'Get 5% discount on local utility services',
        'credits_cost': 50,
        'discount_percentage': 5.0,
        'max_discount_amount': 100.0,
        'validity_days': 30,
      },
      {
        'title': '10% Off Municipal Services',
        'description': 'Get 10% discount on municipal service fees',
        'credits_cost': 100,
        'discount_percentage': 10.0,
        'max_discount_amount': 200.0,
        'validity_days': 60,
      },
      {
        'title': '15% Off Government Services',
        'description': 'Get 15% discount on select government services',
        'credits_cost': 200,
        'discount_percentage': 15.0,
        'max_discount_amount': 500.0,
        'validity_days': 90,
      },
      {
        'title': '₹50 Service Credit',
        'description': 'Get ₹50 credit for local service payments',
        'credits_cost': 150,
        'discount_percentage': 0.0,
        'max_discount_amount': 50.0,
        'validity_days': 45,
      },
    ];
  }

  /// Convert credits to coupon
  static Future<CouponModel?> convertCreditsToCoupon({
    required String userId,
    required Map<String, dynamic> couponTemplate,
  }) async {
    try {
      final userCredits = await getUserTotalCredits(userId);
      final requiredCredits = couponTemplate['credits_cost'] as int;

      if (userCredits < requiredCredits) {
        return null; // Insufficient credits
      }

      // Generate unique coupon code
      final couponCode = _generateCouponCode();
      final validUntil = DateTime.now().add(Duration(days: couponTemplate['validity_days']));

      final couponData = {
        'user_id': userId,
        'coupon_code': couponCode,
        'title': couponTemplate['title'],
        'description': couponTemplate['description'],
        'credits_cost': requiredCredits,
        'discount_percentage': couponTemplate['discount_percentage'],
        'max_discount_amount': couponTemplate['max_discount_amount'],
        'valid_until': validUntil.toIso8601String(),
        'is_redeemed': false,
        'created_at': DateTime.now().toIso8601String(),
      };

      final response = await _supabase
          .from('user_coupons')
          .insert(couponData)
          .select()
          .single();

      // Update user's total credits
      await _updateUserTotalCredits(userId);

      return CouponModel.fromJson(response);
    } catch (e) {
      return null;
    }
  }

  /// Get user's coupons
  static Future<List<CouponModel>> getUserCoupons(String userId) async {
    try {
      final response = await _supabase
          .from('user_coupons')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return response.map((data) => CouponModel.fromJson(data)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Mark coupon as redeemed
  static Future<bool> redeemCoupon(String couponId) async {
    try {
      await _supabase
          .from('user_coupons')
          .update({
            'is_redeemed': true,
            'redeemed_at': DateTime.now().toIso8601String(),
          })
          .eq('id', couponId);
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Generate unique coupon code
  static String _generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final random = DateTime.now().millisecondsSinceEpoch;
    String result = '';
    
    for (int i = 0; i < 8; i++) {
      result += chars[(random + i) % chars.length];
    }
    
    return 'CC$result';
  }
}