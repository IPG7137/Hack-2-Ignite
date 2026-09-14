import 'package:flutter/material.dart';
import 'credit_service.dart';
import 'auth_service.dart';

class PlantShopPage extends StatefulWidget {
  const PlantShopPage({super.key});

  @override
  State<PlantShopPage> createState() => _PlantShopPageState();
}

class _PlantShopPageState extends State<PlantShopPage> with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  
  int _userCredits = 0;
  bool _isLoading = true;
  int _selectedCategoryIndex = 0; // 0: Nursery Vouchers, 1: Plant Adoption
  
  final List<Map<String, dynamic>> _vouchers = [
    {
      'id': 'vch_01',
      'title': '100% Free Sapling Voucher',
      'nursery': 'Solapur Municipal Central Nursery',
      'cost': 40,
      'discount': 'FREE 100%',
      'icon': '🎟️',
      'validity': 'Valid for 30 days',
      'terms': 'Redeemable for any native shade or fruit sapling up to ₹150 value.',
      'code': 'CIVIC-SOLAPUR-FREE-TREE',
      'color': const Color(0xFF059669),
    },
    {
      'id': 'vch_02',
      'title': 'Organic Compost 5kg Bag',
      'nursery': 'Green Solapur Bio-Waste Center',
      'cost': 25,
      'discount': '100% OFF',
      'icon': '🪴',
      'validity': 'Valid for 45 days',
      'terms': 'Enriched organic municipal compost produced from segregated garden waste.',
      'code': 'CIVIC-COMPOST-5KG',
      'color': const Color(0xFFD97706),
    },
    {
      'id': 'vch_03',
      'title': '₹100 Gardening Tools Credit',
      'nursery': 'Agro-Civic Equipment Store',
      'cost': 50,
      'discount': '₹100 OFF',
      'icon': '✂️',
      'validity': 'Valid for 60 days',
      'terms': 'Applicable on pruning shears, trowels, sprayers, and watering cans.',
      'code': 'CIVIC-GARDEN-100',
      'color': const Color(0xFF2563EB),
    },
    {
      'id': 'vch_04',
      'title': 'Medicinal Herb Kit (5 Herbs)',
      'nursery': 'Ayur-Green Urban Nursery',
      'cost': 35,
      'discount': 'FREE KIT',
      'icon': '🌿',
      'validity': 'Valid for 30 days',
      'terms': 'Includes Tulsi, Mint, Lemongrass, Aloe Vera, and Ashwagandha saplings.',
      'code': 'CIVIC-HERB-KIT',
      'color': const Color(0xFF7C3AED),
    },
  ];

  final List<Map<String, dynamic>> _plants = [
    {
      'name': 'Neem Tree',
      'price': 50,
      'description': 'Natural air purifier with medicinal properties',
      'icon': '🌿',
      'benefits': ['Air purification', 'Medicinal use', 'Insect repellent'],
      'color': const Color(0xFF22C55E),
    },
    {
      'name': 'Banyan Tree',
      'price': 75,
      'description': 'Majestic tree providing excellent shade',
      'icon': '🌳',
      'benefits': ['Massive shade', 'Oxygen production', 'Wildlife habitat'],
      'color': const Color(0xFF16A34A),
    },
    {
      'name': 'Mango Tree',
      'price': 60,
      'description': 'Fruit-bearing tree with delicious mangoes',
      'icon': '🥭',
      'benefits': ['Delicious fruits', 'Shade provider', 'Economic value'],
      'color': const Color(0xFFF59E0B),
    },
    {
      'name': 'Tulsi Plant',
      'price': 25,
      'description': 'Sacred plant with healing properties',
      'icon': '🌱',
      'benefits': ['Medicinal properties', 'Spiritual significance', 'Easy care'],
      'color': const Color(0xFF059669),
    },
    {
      'name': 'Aloe Vera',
      'price': 30,
      'description': 'Succulent with healing and cosmetic uses',
      'icon': '🌵',
      'benefits': ['Skin healing', 'Low maintenance', 'Medicinal gel'],
      'color': const Color(0xFF10B981),
    },
    {
      'name': 'Rose Plant',
      'price': 35,
      'description': 'Beautiful flowering plant with fragrant blooms',
      'icon': '🌹',
      'benefits': ['Beautiful flowers', 'Natural fragrance', 'Aesthetic appeal'],
      'color': const Color(0xFFE11D48),
    },
  ];

  @override
  void initState() {
    super.initState();
    
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOut,
    ));
    
    _loadUserCredits();
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadUserCredits() async {
    try {
      final authService = AuthService.instance;
      final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
      if (userId.isEmpty) {
        if (mounted) {
          setState(() {
            _userCredits = 0;
            _isLoading = false;
          });
        }
        return;
      }
      final credits = await CreditService.getUserTotalCredits(userId);
      if (mounted) {
        setState(() {
          _userCredits = credits;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _userCredits = 0;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _redeemVoucher(Map<String, dynamic> voucher) async {
    final cost = voucher['cost'] as int;
    
    if (_userCredits < cost) {
      _showInsufficientCreditsDialog(cost, voucher['title']);
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Text(voucher['icon'], style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Redeem Voucher?',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              voucher['title'],
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
            ),
            const SizedBox(height: 4),
            Text(
              'Partner Nursery: ${voucher['nursery']}',
              style: TextStyle(fontSize: 13, color: Colors.grey[700]),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF86EFAC)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Token Cost:', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    '$cost 🌱 Tokens',
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF15803D), fontSize: 16),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Redeem Now'),
          ),
        ],
      ),
    ) ?? false;

    if (!confirmed) return;

    try {
      final authService = AuthService.instance;
      final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
      if (userId.isEmpty) {
        _showErrorDialog();
        return;
      }
      await CreditService.spendCredits(userId, cost, 'Redeemed ${voucher['title']}');
      if (mounted) {
        setState(() {
          _userCredits -= cost;
        });
      }

      _showClaimSuccessDialog(voucher);
    } catch (e) {
      _showErrorDialog();
    }
  }

  void _showClaimSuccessDialog(Map<String, dynamic> voucher) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 28),
            SizedBox(width: 8),
            Text('Voucher Activated!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const Text(
              'Show this digital pass at the nursery counter:',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFCBD5E1), style: BorderStyle.solid),
              ),
              child: Column(
                children: [
                  const Text('PROMO CODE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey)),
                  const SizedBox(height: 4),
                  SelectableText(
                    voucher['code'],
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: 1.5, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text(
              voucher['terms'],
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            child: const Text('Done'),
          ),
        ],
      ),
    );
  }

  Future<void> _purchasePlant(Map<String, dynamic> plant) async {
    final price = plant['price'] as int;
    
    if (_userCredits < price) {
      _showInsufficientCreditsDialog(price, plant['name']);
      return;
    }

    final confirmed = await _showPurchaseConfirmationDialog(plant);
    if (!confirmed) return;

    try {
      final authService = AuthService.instance;
      final userId = authService.userId ?? authService.supabaseUser?.id ?? '';
      if (userId.isEmpty) {
        _showErrorDialog();
        return;
      }
      final success = await CreditService.spendCredits(
        userId,
        price,
        'Purchased ${plant['name']}',
      );

      if (success) {
        setState(() {
          _userCredits -= price;
        });
        _showSuccessDialog(plant);
      } else {
        _showErrorDialog();
      }
    } catch (e) {
      _showErrorDialog();
    }
  }

  Future<bool> _showPurchaseConfirmationDialog(Map<String, dynamic> plant) async {
    return await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Text(plant['icon'], style: const TextStyle(fontSize: 32)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Adopt ${plant['name']}?',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              plant['description'],
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: plant['color'].withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: plant['color'].withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Contribution:', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(
                    '${plant['price']} 🌱',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: plant['color'],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: plant['color'],
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Confirm'),
          ),
        ],
      ),
    ) ?? false;
  }

  void _showInsufficientCreditsDialog(int requiredPrice, String itemName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Text('🌱', style: TextStyle(fontSize: 28)),
            SizedBox(width: 10),
            Text('More Credits Needed'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'You need $requiredPrice 🌱 tokens for $itemName. You currently have $_userCredits 🌱.',
            ),
            const SizedBox(height: 12),
            const Text(
              'Report more civic complaints or verify resolved issues to earn additional Green Credits!',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            child: const Text('Got it'),
          ),
        ],
      ),
    );
  }

  void _showSuccessDialog(Map<String, dynamic> plant) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Text('🎉', style: TextStyle(fontSize: 28)),
            const SizedBox(width: 10),
            Text('${plant['name']} Planted!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(plant['icon'], style: const TextStyle(fontSize: 54)),
            const SizedBox(height: 12),
            const Text(
              'Thank you! Your civic contribution will be planted in the Solapur Municipal Urban Green Belt.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            child: const Text('Awesome!'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Transaction Failed'),
        content: const Text('Unable to complete credit redemption. Please verify connection.'),
        actions: [
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F17),
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Civic Rewards & Nursery',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            fontSize: 18,
            color: Colors.white,
          ),
        ),
        centerTitle: true,
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Token Balance & Tier Progress Hero Card
                    _buildTokenBalanceCard(),

                    const SizedBox(height: 20),

                    // Section Toggle Pills
                    _buildSectionPills(),

                    const SizedBox(height: 16),

                    // Section Content
                    if (_selectedCategoryIndex == 0)
                      _buildNurseryVouchersList()
                    else
                      _buildPlantAdoptionGrid(),

                    const SizedBox(height: 30),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildTokenBalanceCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1F2937)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF10B981).withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'AVAILABLE GREEN CREDITS',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text('🌱', style: TextStyle(fontSize: 26)),
                      const SizedBox(width: 8),
                      Text(
                        '$_userCredits',
                        style: const TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'Tokens',
                        style: TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.w600, fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF059669)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_rounded, color: Color(0xFF34D399), size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Silver Guardian',
                      style: TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Tier progress bar
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Next Tier: Gold Eco-Warrior (100 🌱)',
                    style: TextStyle(fontSize: 11.5, color: Colors.grey[400]),
                  ),
                  Text(
                    '${((_userCredits / 100).clamp(0.0, 1.0) * 100).toInt()}%',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF34D399)),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: LinearProgressIndicator(
                  value: (_userCredits / 100).clamp(0.0, 1.0),
                  minHeight: 6,
                  backgroundColor: const Color(0xFF1F2937),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF10B981)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSectionPills() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedCategoryIndex = 0),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: _selectedCategoryIndex == 0 ? const Color(0xFF059669) : const Color(0xFF111827),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedCategoryIndex == 0 ? const Color(0xFF10B981) : const Color(0xFF1F2937),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.confirmation_number_outlined, size: 16, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(
                    'Nursery Vouchers (${_vouchers.length})',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedCategoryIndex = 1),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: _selectedCategoryIndex == 1 ? const Color(0xFF059669) : const Color(0xFF111827),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedCategoryIndex == 1 ? const Color(0xFF10B981) : const Color(0xFF1F2937),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.park_outlined, size: 16, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(
                    'Adopt Trees (${_plants.length})',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNurseryVouchersList() {
    return Column(
      children: _vouchers.map((v) => _buildVoucherCard(v)).toList(),
    );
  }

  Widget _buildVoucherCard(Map<String, dynamic> voucher) {
    final canAfford = _userCredits >= (voucher['cost'] as int);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: canAfford ? (voucher['color'] as Color).withValues(alpha: 0.3) : const Color(0xFF1F2937),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: (voucher['color'] as Color).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: (voucher['color'] as Color).withValues(alpha: 0.3)),
            ),
            child: Center(
              child: Text(voucher['icon'], style: const TextStyle(fontSize: 22)),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        voucher['title'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: (voucher['color'] as Color).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        voucher['discount'],
                        style: TextStyle(
                          color: voucher['color'] as Color,
                          fontWeight: FontWeight.w800,
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  '📍 ${voucher['nursery']}',
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '${voucher['cost']} 🌱 Tokens',
                      style: TextStyle(
                        color: canAfford ? const Color(0xFF34D399) : const Color(0xFF64748B),
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                    ),
                    SizedBox(
                      height: 30,
                      child: ElevatedButton(
                        onPressed: canAfford ? () => _redeemVoucher(voucher) : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: voucher['color'] as Color,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFF1F2937),
                          disabledForegroundColor: const Color(0xFF64748B),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        child: Text(
                          canAfford ? 'Redeem' : 'Need ${voucher['cost'] - _userCredits} 🌱',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlantAdoptionGrid() {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.78,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: _plants.length,
      itemBuilder: (context, index) {
        final plant = _plants[index];
        final canAfford = _userCredits >= (plant['price'] as int);

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF111827),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: canAfford ? (plant['color'] as Color).withValues(alpha: 0.3) : const Color(0xFF1F2937),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(plant['icon'], style: const TextStyle(fontSize: 28)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (plant['color'] as Color).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${plant['price']} 🌱',
                      style: TextStyle(
                        color: plant['color'] as Color,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                plant['name'],
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 3),
              Expanded(
                child: Text(
                  plant['description'],
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.25),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                height: 32,
                child: ElevatedButton(
                  onPressed: canAfford ? () => _purchasePlant(plant) : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: plant['color'] as Color,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFF1F2937),
                    disabledForegroundColor: const Color(0xFF64748B),
                    padding: EdgeInsets.zero,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  child: Text(
                    canAfford ? 'Adopt' : '${plant['price'] - _userCredits} more 🌱',
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}