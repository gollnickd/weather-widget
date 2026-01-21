<?php
/**
 * Plugin Name: Perfect Paddles Water Conditions Widget
 * Plugin URI: https://perfectpaddles.com/widget
 * Description: Display real-time water conditions with beginner/intermediate/advanced indicators for paddleboarding, kayaking, and water sports.
 * Version: 1.0.0
 * Author: Perfect Paddles
 * Author URI: https://perfectpaddles.com
 * License: GPL v2 or later
 * Text Domain: pp-water-widget
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('PP_WIDGET_VERSION', '1.0.0');
define('PP_WIDGET_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('PP_WIDGET_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class PP_Water_Widget {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Initialize plugin
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Register shortcode
        add_shortcode('pp_water_widget', array($this, 'render_shortcode'));
        
        // Register widget
        add_action('widgets_init', array($this, 'register_widget'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        load_plugin_textdomain('pp-water-widget', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        // Only load if widget is being used
        if (is_active_widget(false, false, 'pp_water_widget') || has_shortcode(get_post()->post_content ?? '', 'pp_water_widget')) {
            wp_enqueue_script(
                'pp-water-widget',
                'https://your-domain.com/widget/water-conditions-widget.js',
                array(),
                PP_WIDGET_VERSION,
                true
            );
        }
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('PP Water Widget Settings', 'pp-water-widget'),
            __('PP Water Widget', 'pp-water-widget'),
            'manage_options',
            'pp-water-widget',
            array($this, 'render_admin_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('pp_water_widget_options', 'pp_water_widget_api_key');
        register_setting('pp_water_widget_options', 'pp_water_widget_location_id');
        register_setting('pp_water_widget_options', 'pp_water_widget_width');
    }
    
    /**
     * Render admin settings page
     */
    public function render_admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // Save settings
        if (isset($_POST['pp_widget_submit'])) {
            check_admin_referer('pp_widget_settings');
            update_option('pp_water_widget_api_key', sanitize_text_field($_POST['api_key']));
            update_option('pp_water_widget_location_id', sanitize_text_field($_POST['location_id']));
            update_option('pp_water_widget_width', sanitize_text_field($_POST['width']));
            echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'pp-water-widget') . '</p></div>';
        }
        
        $api_key = get_option('pp_water_widget_api_key', '');
        $location_id = get_option('pp_water_widget_location_id', '');
        $width = get_option('pp_water_widget_width', '400px');
        ?>
        
        <div class="wrap">
            <h1><?php echo esc_html__('Perfect Paddles Water Conditions Widget', 'pp-water-widget'); ?></h1>
            
            <div style="background: #fff; padding: 20px; margin: 20px 0; border-left: 4px solid #0099cc;">
                <h2><?php echo esc_html__('About This Widget', 'pp-water-widget'); ?></h2>
                <p><?php echo esc_html__('Display real-time water and wind conditions with color-coded indicators (green for beginners, orange for intermediate, red for advanced). The widget automatically refreshes every 10 minutes.', 'pp-water-widget'); ?></p>
            </div>
            
            <form method="post" action="">
                <?php wp_nonce_field('pp_widget_settings'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="api_key"><?php echo esc_html__('API Key', 'pp-water-widget'); ?> *</label>
                        </th>
                        <td>
                            <input type="text" id="api_key" name="api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" required>
                            <p class="description"><?php echo esc_html__('Your Perfect Paddles API key (e.g., pp_1234567890abcdef)', 'pp-water-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="location_id"><?php echo esc_html__('Location ID', 'pp-water-widget'); ?> *</label>
                        </th>
                        <td>
                            <input type="text" id="location_id" name="location_id" value="<?php echo esc_attr($location_id); ?>" class="regular-text" required>
                            <p class="description"><?php echo esc_html__('The ID for your water location (e.g., 1 for Mother\'s Beach)', 'pp-water-widget'); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="width"><?php echo esc_html__('Widget Width', 'pp-water-widget'); ?></label>
                        </th>
                        <td>
                            <input type="text" id="width" name="width" value="<?php echo esc_attr($width); ?>" class="regular-text">
                            <p class="description"><?php echo esc_html__('Default: 400px. Can use px, %, or auto', 'pp-water-widget'); ?></p>
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="pp_widget_submit" class="button button-primary" value="<?php echo esc_attr__('Save Settings', 'pp-water-widget'); ?>">
                </p>
            </form>
            
            <div style="background: #f0f0f1; padding: 20px; margin: 20px 0;">
                <h2><?php echo esc_html__('Usage Instructions', 'pp-water-widget'); ?></h2>
                
                <h3><?php echo esc_html__('Method 1: Shortcode', 'pp-water-widget'); ?></h3>
                <p><?php echo esc_html__('Add this shortcode to any post or page:', 'pp-water-widget'); ?></p>
                <code style="display: block; background: #fff; padding: 10px; margin: 10px 0;">[pp_water_widget]</code>
                
                <h3 style="margin-top: 20px;"><?php echo esc_html__('Method 2: Widget', 'pp-water-widget'); ?></h3>
                <p><?php echo esc_html__('Go to Appearance → Widgets and add "Perfect Paddles Water Conditions" to your sidebar.', 'pp-water-widget'); ?></p>
                
                <h3 style="margin-top: 20px;"><?php echo esc_html__('Method 3: PHP Code', 'pp-water-widget'); ?></h3>
                <p><?php echo esc_html__('Add this to your theme template:', 'pp-water-widget'); ?></p>
                <code style="display: block; background: #fff; padding: 10px; margin: 10px 0;">&lt;?php echo do_shortcode('[pp_water_widget]'); ?&gt;</code>
            </div>
            
            <div style="background: #fff; padding: 20px; margin: 20px 0; border-left: 4px solid #0099cc;">
                <h3><?php echo esc_html__('Need Help?', 'pp-water-widget'); ?></h3>
                <p>
                    <?php echo esc_html__('Contact Perfect Paddles support:', 'pp-water-widget'); ?><br>
                    <strong>Email:</strong> support@perfectpaddles.com<br>
                    <strong>Website:</strong> <a href="https://perfectpaddles.com/widget-support" target="_blank">perfectpaddles.com/widget-support</a>
                </p>
            </div>
        </div>
        
        <?php
    }
    
    /**
     * Render shortcode
     */
    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'api_key' => get_option('pp_water_widget_api_key', ''),
            'location_id' => get_option('pp_water_widget_location_id', ''),
            'width' => get_option('pp_water_widget_width', '400px')
        ), $atts);
        
        if (empty($atts['api_key']) || empty($atts['location_id'])) {
            return '<div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 8px; text-align: center;">
                <strong>Widget Configuration Required</strong><br>
                Please configure your API key and location ID in Settings → PP Water Widget
            </div>';
        }
        
        $widget_id = 'pp-widget-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($widget_id); ?>" 
             data-pp-widget 
             data-api-key="<?php echo esc_attr($atts['api_key']); ?>" 
             data-location-id="<?php echo esc_attr($atts['location_id']); ?>"
             style="max-width: <?php echo esc_attr($atts['width']); ?>; margin: 0 auto;"></div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * Register WordPress widget
     */
    public function register_widget() {
        register_widget('PP_Water_Widget_Widget');
    }
}

/**
 * WordPress Widget Class
 */
class PP_Water_Widget_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'pp_water_widget',
            __('Perfect Paddles Water Conditions', 'pp-water-widget'),
            array('description' => __('Display water conditions widget', 'pp-water-widget'))
        );
    }
    
    public function widget($args, $instance) {
        echo $args['before_widget'];
        
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        
        echo do_shortcode('[pp_water_widget]');
        
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : '';
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>"><?php echo esc_html__('Title:', 'pp-water-widget'); ?></label>
            <input class="widefat" id="<?php echo esc_attr($this->get_field_id('title')); ?>" 
                   name="<?php echo esc_attr($this->get_field_name('title')); ?>" 
                   type="text" value="<?php echo esc_attr($title); ?>">
        </p>
        <p>
            <small><?php echo esc_html__('Configure API key and location in Settings → PP Water Widget', 'pp-water-widget'); ?></small>
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        return $instance;
    }
}

// Initialize plugin
PP_Water_Widget::get_instance();
