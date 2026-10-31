import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';

import '../../../core/theme/app_theme.dart';
import '../models/menu_item_model.dart';

/// Modal dialog for creating or editing menu items
class EditMenuItemDialog extends StatefulWidget {
  final MenuItem? item;
  final String restaurantId;
  final ValueChanged<MenuItem>? onSave;

  const EditMenuItemDialog({
    super.key,
    this.item,
    required this.restaurantId,
    this.onSave,
  });

  /// Helper to show this dialog directly
  static Future<MenuItem?> show(
    BuildContext context, {
    MenuItem? item,
    required String restaurantId,
    ValueChanged<MenuItem>? onSave,
  }) {
    return showDialog<MenuItem>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => EditMenuItemDialog(
        item: item,
        restaurantId: restaurantId,
        onSave: onSave,
      ),
    );
  }

  @override
  State<EditMenuItemDialog> createState() => _EditMenuItemDialogState();
}

class _EditMenuItemDialogState extends State<EditMenuItemDialog> {
  final _formKey = GlobalKey<FormState>();

  late TextEditingController _nameController;
  late TextEditingController _priceController;
  late TextEditingController _descriptionController;
  late TextEditingController _categoryController;

  late bool _isAvailable;
  late bool _isVeg;
  late bool _isSpecial;
  String? _currentImageUrl;
  XFile? _pickedImage;
  Uint8List? _pickedImageBytes;

  final ImagePicker _picker = ImagePicker();

  static const List<String> _commonCategories = [
    'Burgers',
    'Pizzas',
    'Noodles',
    'Main Course',
    'Starters',
    'Desserts',
    'Beverages',
    'Thali',
    'Biryani',
    'Snacks',
  ];

  @override
  void initState() {
    super.initState();
    final item = widget.item;
    _nameController = TextEditingController(text: item?.name ?? '');
    _priceController = TextEditingController(
      text: item != null && item.price > 0 ? item.price.toStringAsFixed(2) : '',
    );
    _descriptionController = TextEditingController(text: item?.description ?? '');
    _categoryController = TextEditingController(text: item?.category ?? 'Main Course');

    _isAvailable = item?.isAvailable ?? true;
    _isVeg = item?.isVeg ?? true;
    _isSpecial = item?.isSpecial ?? false;
    _currentImageUrl = item?.imageUrl;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    _categoryController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );

      if (image != null) {
        final bytes = await image.readAsBytes();
        setState(() {
          _pickedImage = image;
          _pickedImageBytes = bytes;
          _currentImageUrl = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: AppColors.destructive,
          ),
        );
      }
    }
  }

  void _clearImage() {
    setState(() {
      _pickedImage = null;
      _pickedImageBytes = null;
      _currentImageUrl = null;
    });
  }

  void _handleSave() {
    if (!_formKey.currentState!.validate()) return;

    final parsedPrice = double.tryParse(_priceController.text.trim()) ?? 0.0;
    final finalImageUrl = _currentImageUrl;

    final updated = MenuItem(
      id: widget.item?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      restaurantId: widget.restaurantId,
      name: _nameController.text.trim(),
      price: parsedPrice,
      category: _categoryController.text.trim().isEmpty ? 'General' : _categoryController.text.trim(),
      description: _descriptionController.text.trim().isEmpty ? null : _descriptionController.text.trim(),
      isAvailable: _isAvailable,
      imageUrl: finalImageUrl,
      variants: widget.item?.variants ?? [],
      isVeg: _isVeg,
      isSpecial: _isSpecial,
      pricingType: widget.item?.pricingType,
      pricingUnit: widget.item?.pricingUnit,
      baseUnitQuantity: widget.item?.baseUnitQuantity,
      createdAt: widget.item?.createdAt ?? DateTime.now(),
    );

    widget.onSave?.call(updated);
    Navigator.of(context).pop(updated);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEditing = widget.item != null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: isDark ? AppColors.cardDark : AppColors.cardLight,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 720),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Dialog Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(25),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(LucideIcons.utensils, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEditing ? 'Edit Menu Item' : 'New Menu Item',
                          style: GoogleFonts.poppins(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.textDark : AppColors.textLight,
                          ),
                        ),
                        Text(
                          isEditing ? 'Update pricing, availability & details' : 'Add fresh item to menu catalog',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.x, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),

            // Scrollable Form Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Photo Upload Preview
                      Text(
                        'Item Photo',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textDark : AppColors.textLight,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _buildImageSection(isDark),

                      const SizedBox(height: 18),

                      // Item Name
                      Text(
                        'Dish / Item Name *',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textDark : AppColors.textLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _nameController,
                        style: GoogleFonts.inter(fontSize: 14),
                        decoration: InputDecoration(
                          hintText: 'e.g. Paneer Butter Masala',
                          prefixIcon: const Icon(LucideIcons.edit2, size: 16),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter item name';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 16),

                      // Price & Category Row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Price
                          Expanded(
                            flex: 5,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Price (₹) *',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.textDark : AppColors.textLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                TextFormField(
                                  controller: _priceController,
                                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600),
                                  decoration: InputDecoration(
                                    hintText: '0.00',
                                    prefixText: '₹ ',
                                    prefixStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                  ),
                                  validator: (val) {
                                    if (val == null || val.trim().isEmpty) {
                                      return 'Required';
                                    }
                                    final p = double.tryParse(val.trim());
                                    if (p == null || p < 0 || !p.isFinite) {
                                      return 'Invalid';
                                    }
                                    return null;
                                  },
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Category
                          Expanded(
                            flex: 6,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Category *',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.textDark : AppColors.textLight,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Autocomplete<String>(
                                  initialValue: TextEditingValue(text: _categoryController.text),
                                  optionsBuilder: (textEditingValue) {
                                    if (textEditingValue.text.isEmpty) {
                                      return _commonCategories;
                                    }
                                    return _commonCategories.where(
                                      (cat) => cat.toLowerCase().contains(textEditingValue.text.toLowerCase()),
                                    );
                                  },
                                  onSelected: (String selection) {
                                    _categoryController.text = selection;
                                  },
                                  fieldViewBuilder: (context, controller, focusNode, onFieldSubmitted) {
                                    return TextFormField(
                                      controller: controller,
                                      focusNode: focusNode,
                                      style: GoogleFonts.inter(fontSize: 14),
                                      onChanged: (val) {
                                        _categoryController.text = val;
                                      },
                                      decoration: InputDecoration(
                                        hintText: 'Select or type...',
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      ),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Dietary and Availability Toggles
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.bgDark.withAlpha(128) : AppColors.bgLight,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            // Quick 86 Availability Toggle
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      _isAvailable ? LucideIcons.checkCircle2 : LucideIcons.alertCircle,
                                      color: _isAvailable ? AppColors.available : AppColors.destructive,
                                      size: 18,
                                    ),
                                    const SizedBox(width: 8),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Item Available (In Stock)',
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: isDark ? AppColors.textDark : AppColors.textLight,
                                          ),
                                        ),
                                        Text(
                                          _isAvailable ? 'Customers can order this' : '86\'d / Temporarily sold out',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            color: _isAvailable ? AppColors.available : AppColors.destructive,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Switch.adaptive(
                                  value: _isAvailable,
                                  activeTrackColor: AppColors.available,
                                  onChanged: (val) => setState(() => _isAvailable = val),
                                ),
                              ],
                            ),
                            const Divider(height: 18),
                            // Veg / Non-Veg toggle
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 18,
                                      height: 18,
                                      padding: const EdgeInsets.all(3),
                                      decoration: BoxDecoration(
                                        border: Border.all(
                                          color: _isVeg ? Colors.green : Colors.red,
                                          width: 1.5,
                                        ),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Center(
                                        child: Container(
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color: _isVeg ? Colors.green : Colors.red,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      _isVeg ? 'Vegetarian' : 'Non-Vegetarian',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: isDark ? AppColors.textDark : AppColors.textLight,
                                      ),
                                    ),
                                  ],
                                ),
                                SegmentedButton<bool>(
                                  segments: const [
                                    ButtonSegment(value: true, label: Text('Veg')),
                                    ButtonSegment(value: false, label: Text('Non-Veg')),
                                  ],
                                  selected: {_isVeg},
                                  onSelectionChanged: (set) {
                                    setState(() => _isVeg = set.first);
                                  },
                                  style: const ButtonStyle(
                                    visualDensity: VisualDensity.compact,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Description
                      Text(
                        'Description',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textDark : AppColors.textLight,
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _descriptionController,
                        maxLines: 3,
                        style: GoogleFonts.inter(fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'Ingredients, spice level, allergen warnings...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          contentPadding: const EdgeInsets.all(12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Dialog Footer Actions
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    onPressed: _handleSave,
                    icon: const Icon(LucideIcons.check, size: 16),
                    label: Text(
                      isEditing ? 'Save Changes' : 'Add Item',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageSection(bool isDark) {
    final hasBytes = _pickedImageBytes != null;
    final hasRemote = _currentImageUrl != null &&
        _currentImageUrl!.isNotEmpty &&
        !_currentImageUrl!.contains('placeholder');
    final hasLocalPath = _pickedImage != null && !kIsWeb;

    if (hasBytes || hasRemote || hasLocalPath) {
      return Container(
        height: 140,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (hasBytes)
              Image.memory(_pickedImageBytes!, fit: BoxFit.cover)
            else if (hasLocalPath)
              Image.file(File(_pickedImage!.path), fit: BoxFit.cover)
            else if (hasRemote)
              Image.network(
                _currentImageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => _buildFallbackPlaceholder(isDark),
              ),
            Positioned(
              top: 8,
              right: 8,
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: Colors.black54,
                    child: IconButton(
                      icon: const Icon(LucideIcons.camera, size: 14, color: Colors.white),
                      onPressed: () => _pickImage(ImageSource.gallery),
                      padding: EdgeInsets.zero,
                    ),
                  ),
                  const SizedBox(width: 6),
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: Colors.black54,
                    child: IconButton(
                      icon: const Icon(LucideIcons.trash2, size: 14, color: Colors.redAccent),
                      onPressed: _clearImage,
                      padding: EdgeInsets.zero,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.bgDark : AppColors.bgLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          Icon(
            LucideIcons.image,
            size: 32,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(height: 8),
          Text(
            'Upload item photo for POS & Digital Menu',
            style: GoogleFonts.inter(
              fontSize: 12,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              OutlinedButton.icon(
                icon: const Icon(LucideIcons.camera, size: 14),
                label: const Text('Camera'),
                onPressed: () => _pickImage(ImageSource.camera),
                style: OutlinedButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                icon: const Icon(LucideIcons.image, size: 14),
                label: const Text('Gallery'),
                onPressed: () => _pickImage(ImageSource.gallery),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  visualDensity: VisualDensity.compact,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackPlaceholder(bool isDark) {
    return Container(
      color: isDark ? AppColors.cardDark : AppColors.cardLight,
      child: const Center(
        child: Icon(LucideIcons.utensils, size: 36, color: Colors.grey),
      ),
    );
  }
}
