<?php
/**
 * Plugin Name: Perfect Paddles Water Conditions Widget
 * Plugin URI: https://perfectpaddles.com/water-conditions-widget
 * Description: Display real-time water and wind conditions for paddleboarding, kayaking, and watersports
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

// Define plugin constants
define('PP_WATER_WIDGET_VERSION', '1.0.0');
define('PP_WATER_WIDGET_PATH', plugin_dir_path(__FILE__));
define('PP_WATER_WIDGET_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
class PP_Water_Widget {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_shortcode('pp_water_widget', array($this, 'shortcode'));
        add_action('admin_menu', array($this, 'admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
    }
    
    /**
     * Initialize plugin
     */
    public function init() {
        // Register widget
        add_action('widgets_init', function() {
            register_widget('PP_Water_Widget_Widget');
        });
    }
    
    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_script(
            'pp-water-widget',
            PP_WATER_WIDGET_URL . 'assets/widget.js',
            array(),
            PP_WATER_WIDGET_VERSION,
            true
        );
    }
    
    /**
     * Shortcode handler
     * Usage: [pp_water_widget]
     */
    public function shortcode($atts) {
        $atts = shortcode_atts(array(
            'container_id' => 'pp-water-widget-' . uniqid(),
            'api_key' => get_option('pp_water_widget_api_key', ''),
        ), $atts);
        
        if (empty($atts['api_key'])) {
            return '<div class="pp-widget-error">Please configure your API key in Settings → Water Conditions Widget</div>';
        }
        
        $output = '<div id="' . esc_attr($atts['container_id']) . '"></div>';
        $output .= '<script>
            if (typeof PPWaterWidget !== "undefined") {
                PPWaterWidget.init({
                    containerId: "' . esc_js($atts['container_id']) . '",
                    apiKey: "' . esc_js($atts['api_key']) . '",
                    apiEndpoint: "' . esc_js(get_option('pp_water_widget_api_endpoint', 'https://your-domain.com/api/widget/conditions')) . '"
                });
            }
        </script>';
        
        return $output;
    }
    
    /**
     * Add admin menu
     */
    public function admin_menu() {
        add_options_page(
            'Water Conditions Widget Settings',
            'Water Conditions Widget',
            'manage_options',
            'pp-water-widget',
            array($this, 'settings_page')
        );
    }
    
    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('pp_water_widget_settings', 'pp_water_widget_api_key');
        register_setting('pp_water_widget_settings', 'pp_water_widget_api_endpoint');
        
        add_settings_section(
            'pp_water_widget_main',
            'API Configuration',
            array($this, 'settings_section_callback'),
            'pp-water-widget'
        );
        
        add_settings_field(
            'pp_water_widget_api_key',
            'API Key',
            array($this, 'api_key_field_callback'),
            'pp-water-widget',
            'pp_water_widget_main'
        );
        
        add_settings_field(
            'pp_water_widget_api_endpoint',
            'API Endpoint',
            array($this, 'api_endpoint_field_callback'),
            'pp-water-widget',
            'pp_water_widget_main'
        );
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>Configure your Perfect Paddles Water Conditions Widget settings below.</p>';
    }
    
    /**
     * API Key field callback
     */
    public function api_key_field_callback() {
        $api_key = get_option('pp_water_widget_api_key', '');
        echo '<input type="text" name="pp_water_widget_api_key" value="' . esc_attr($api_key) . '" class="regular-text" />';
        echo '<p class="description">Enter your API key provided by Perfect Paddles</p>';
    }
    
    /**
     * API Endpoint field callback
     */
    public function api_endpoint_field_callback() {
        $endpoint = get_option('pp_water_widget_api_endpoint', 'https://your-domain.com/api/widget/conditions');
        echo '<input type="text" name="pp_water_widget_api_endpoint" value="' . esc_attr($endpoint) . '" class="regular-text" />';
        echo '<p class="description">API endpoint URL (usually you don\'t need to change this)</p>';
    }
    
    /**
     * Settings page
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>Perfect Paddles Water Conditions Widget</h1>
            
            <h2 class="nav-tab-wrapper">
                <a href="#settings" class="nav-tab nav-tab-active">Settings</a>
                <a href="#usage" class="nav-tab">Usage</a>
            </h2>
            
            <div id="settings" class="tab-content">
                <form method="post" action="options.php">
                    <?php
                    settings_fields('pp_water_widget_settings');
                    do_settings_sections('pp-water-widget');
                    submit_button();
                    ?>
                </form>
            </div>
            
            <div id="usage" class="tab-content" style="display: none;">
                <h2>How to Use</h2>
                
                <h3>Method 1: Shortcode</h3>
                <p>Add this shortcode to any post, page, or widget area:</p>
                <code>[pp_water_widget]</code>
                
                <h3>Method 2: Widget</h3>
                <p>Go to Appearance → Widgets and add the "Water Conditions" widget to any sidebar or widget area.</p>
                
                <h3>Method 3: PHP Template</h3>
                <p>Add this code to your theme template:</p>
                <code>&lt;?php echo do_shortcode('[pp_water_widget]'); ?&gt;</code>
                
                <h3>Need Help?</h3>
                <p>Contact support at <a href="mailto:support@perfectpaddles.com">support@perfectpaddles.com</a></p>
            </div>
            
            <script>
            jQuery(document).ready(function($) {
                $('.nav-tab').click(function(e) {
                    e.preventDefault();
                    $('.nav-tab').removeClass('nav-tab-active');
                    $(this).addClass('nav-tab-active');
                    $('.tab-content').hide();
                    $($(this).attr('href')).show();
                });
            });
            </script>
        </div>
        <?php
    }
}

/**
 * WordPress Widget Class
 */
class PP_Water_Widget_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'pp_water_widget',
            'Water Conditions',
            array('description' => 'Display water and wind conditions')
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
            <label for="<?php echo $this->get_field_id('title'); ?>">Title:</label>
            <input class="widefat" id="<?php echo $this->get_field_id('title'); ?>" 
                   name="<?php echo $this->get_field_name('title'); ?>" type="text" 
                   value="<?php echo esc_attr($title); ?>">
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? strip_tags($new_instance['title']) : '';
        return $instance;
    }
}

// Initialize plugin
PP_Water_Widget::get_instance();
