import 'package:flutter/material.dart';
import 'language_service.dart';
import 'report_details_screen.dart';

class CategorySelectionScreen extends StatefulWidget {
  const CategorySelectionScreen({super.key});

  @override
  State<CategorySelectionScreen> createState() => _CategorySelectionScreenState();
}

class _CategorySelectionScreenState extends State<CategorySelectionScreen> {
  final LanguageService _languageService = LanguageService();
  String? selectedCategory;

  final List<ReportCategory> categories = [
    ReportCategory(
      id: 'potholes_roads',
      name: 'Roads & Potholes',
      icon: Icons.add_road_rounded,
      color: const Color(0xFF155EEF),
      gradient: const LinearGradient(
        colors: [Color(0xFF155EEF), Color(0xFF175CD3)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Potholes, broken roads, damaged footpaths',
    ),
    ReportCategory(
      id: 'water_drainage',
      name: 'Water Supply & Leaks',
      icon: Icons.water_drop_rounded,
      color: const Color(0xFF0086C9),
      gradient: const LinearGradient(
        colors: [Color(0xFF0086C9), Color(0xFF026AA2)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Pipe bursts, low pressure, contaminated water',
    ),
    ReportCategory(
      id: 'drainage_sewage',
      name: 'Drainage & Sewage',
      icon: Icons.water_rounded,
      color: const Color(0xFF0E7090),
      gradient: const LinearGradient(
        colors: [Color(0xFF0E7090), Color(0xFF155E75)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Blocked drains, open manholes, overflowing sewage',
    ),
    ReportCategory(
      id: 'electricity_streetlights',
      name: 'Electricity & Streetlights',
      icon: Icons.lightbulb_rounded,
      color: const Color(0xFFD97706),
      gradient: const LinearGradient(
        colors: [Color(0xFFD97706), Color(0xFFB45309)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Faulty streetlights, hanging wires, power failure',
    ),
    ReportCategory(
      id: 'waste_management',
      name: 'Garbage & Sanitation',
      icon: Icons.delete_outline_rounded,
      color: const Color(0xFF059669),
      gradient: const LinearGradient(
        colors: [Color(0xFF059669), Color(0xFF047857)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Uncollected garbage, open dumping, bin overflow',
    ),
    ReportCategory(
      id: 'safety_hazard',
      name: 'Public Safety Hazards',
      icon: Icons.shield_outlined,
      color: const Color(0xFFD92D20),
      gradient: const LinearGradient(
        colors: [Color(0xFFD92D20), Color(0xFFB42318)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Dangerous structures, open pits, fire hazards',
    ),
    ReportCategory(
      id: 'parks_trees',
      name: 'Parks & Fallen Trees',
      icon: Icons.park_rounded,
      color: const Color(0xFF16A34A),
      gradient: const LinearGradient(
        colors: [Color(0xFF16A34A), Color(0xFF15803D)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Overgrown trees, branch clearing, park upkeep',
    ),
    ReportCategory(
      id: 'illegal_encroachment',
      name: 'Illegal Encroachment',
      icon: Icons.block_rounded,
      color: const Color(0xFF7C3AED),
      gradient: const LinearGradient(
        colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Footpath blocking, unauthorized construction',
    ),
    ReportCategory(
      id: 'other',
      name: 'Other Grievance',
      icon: Icons.more_horiz_rounded,
      color: const Color(0xFF475467),
      gradient: const LinearGradient(
        colors: [Color(0xFF475467), Color(0xFF344054)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description: 'Municipal issues not listed in categories above',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLanguageChanged);
  }

  @override
  void dispose() {
    _languageService.removeListener(_onLanguageChanged);
    super.dispose();
  }

  void _onLanguageChanged() {
    setState(() {});
  }

  void _selectCategory(ReportCategory category) {
    setState(() {
      selectedCategory = category.id;
    });

    // Short tactile delay before transition
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ReportDetailsScreen(category: category),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F9FC),
      appBar: AppBar(
        backgroundColor: const Color(0xFF123B63),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Register Grievance',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            Text(
              'Step 1 of 3: Select Category',
              style: TextStyle(
                fontSize: 11,
                color: Color(0xFFCBD5E1),
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Step Progress Bar (33%)
          Container(
            height: 4,
            width: double.infinity,
            color: const Color(0xFFE4E7EC),
            alignment: Alignment.centerLeft,
            child: Container(
              height: 4,
              width: MediaQuery.of(context).size.width * 0.33,
              color: const Color(0xFF155EEF),
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Official Instructions Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE4E7EC)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Select the issue category',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF172B4D),
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Choose the municipal service division that best matches the problem in your area.',
                          style: TextStyle(
                            fontSize: 12.5,
                            color: Color(0xFF667085),
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  const Text(
                    'Municipal Departments',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF344054),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Categories List/Grid
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: categories.length,
                    itemBuilder: (context, index) {
                      final category = categories[index];
                      final isSelected = selectedCategory == category.id;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFFEFF8FF) : Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF155EEF) : const Color(0xFFE4E7EC),
                            width: isSelected ? 1.5 : 1.0,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x06000000),
                              blurRadius: 4,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                        child: InkWell(
                          onTap: () => _selectCategory(category),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 42,
                                  height: 42,
                                  decoration: BoxDecoration(
                                    color: category.color.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(category.icon, color: category.color, size: 22),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        category.name,
                                        style: TextStyle(
                                          fontSize: 14.5,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF172B4D),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        category.description,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: Color(0xFF667085),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  isSelected ? Icons.check_circle : Icons.chevron_right,
                                  color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF98A2B3),
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ReportCategory {
  final String id;
  final String name;
  final IconData icon;
  final Color color;
  final LinearGradient gradient;
  final String description;

  ReportCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.gradient,
    required this.description,
  });
}