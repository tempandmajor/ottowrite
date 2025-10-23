/**
 * Submission Notifications System
 *
 * Ticket: MS-4.2
 *
 * Creates tables and functions for managing submission notifications including:
 * - User notification preferences
 * - Notification logs (in-app and email)
 * - Automatic notification triggers for submission events
 */

-- ============================================================================
-- TABLES
-- ============================================================================

/**
 * submission_notification_preferences
 *
 * Stores user preferences for which submission events should trigger notifications.
 * Users can enable/disable notifications per event type and choose delivery method.
 */
CREATE TABLE submission_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification channels
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,

  -- Event preferences
  notify_partner_viewed BOOLEAN DEFAULT true,
  notify_material_requested BOOLEAN DEFAULT true,
  notify_response_received BOOLEAN DEFAULT true,
  notify_status_accepted BOOLEAN DEFAULT true,
  notify_status_rejected BOOLEAN DEFAULT true,
  notify_submission_reminder BOOLEAN DEFAULT false,

  -- Email digest settings
  email_digest_frequency TEXT DEFAULT 'immediate' CHECK (email_digest_frequency IN ('immediate', 'daily', 'weekly', 'never')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One preference record per user
  UNIQUE(user_id)
);

COMMENT ON TABLE submission_notification_preferences IS 'User preferences for submission notification settings';

/**
 * submission_notifications
 *
 * Log of all notifications sent to users about submission events.
 * Used for in-app notification display and audit trail.
 */
CREATE TABLE submission_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES manuscript_submissions(id) ON DELETE CASCADE,
  partner_submission_id UUID REFERENCES partner_submissions(id) ON DELETE SET NULL,

  -- Notification details
  type TEXT NOT NULL CHECK (type IN (
    'partner_viewed',
    'material_requested',
    'response_received',
    'status_accepted',
    'status_rejected',
    'submission_reminder'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Metadata (partner name, response snippet, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Delivery tracking
  sent_via_email BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for efficient queries
  INDEX idx_submission_notifications_user_id ON submission_notifications(user_id),
  INDEX idx_submission_notifications_created_at ON submission_notifications(created_at DESC),
  INDEX idx_submission_notifications_read_at ON submission_notifications(read_at),
  INDEX idx_submission_notifications_type ON submission_notifications(type)
);

COMMENT ON TABLE submission_notifications IS 'Log of all submission notifications sent to users';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE submission_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_notifications ENABLE ROW LEVEL SECURITY;

-- Notification preferences policies
CREATE POLICY "Users can view own notification preferences"
  ON submission_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON submission_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON submission_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON submission_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON submission_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

/**
 * get_notification_preferences
 *
 * Returns notification preferences for a user, creating default preferences if none exist.
 */
CREATE OR REPLACE FUNCTION get_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  email_enabled BOOLEAN,
  in_app_enabled BOOLEAN,
  notify_partner_viewed BOOLEAN,
  notify_material_requested BOOLEAN,
  notify_response_received BOOLEAN,
  notify_status_accepted BOOLEAN,
  notify_status_rejected BOOLEAN,
  notify_submission_reminder BOOLEAN,
  email_digest_frequency TEXT
) AS $$
BEGIN
  -- Create default preferences if they don't exist
  INSERT INTO submission_notification_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Return preferences
  RETURN QUERY
  SELECT
    snp.email_enabled,
    snp.in_app_enabled,
    snp.notify_partner_viewed,
    snp.notify_material_requested,
    snp.notify_response_received,
    snp.notify_status_accepted,
    snp.notify_status_rejected,
    snp.notify_submission_reminder,
    snp.email_digest_frequency
  FROM submission_notification_preferences snp
  WHERE snp.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * create_submission_notification
 *
 * Creates a notification for a submission event if user has enabled that notification type.
 * Returns the created notification ID or NULL if notification was not created.
 */
CREATE OR REPLACE FUNCTION create_submission_notification(
  p_user_id UUID,
  p_submission_id UUID,
  p_partner_submission_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
  v_should_notify BOOLEAN := false;
  v_send_email BOOLEAN := false;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM submission_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO submission_notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  -- Check if this notification type is enabled
  CASE p_type
    WHEN 'partner_viewed' THEN
      v_should_notify := v_prefs.notify_partner_viewed;
    WHEN 'material_requested' THEN
      v_should_notify := v_prefs.notify_material_requested;
    WHEN 'response_received' THEN
      v_should_notify := v_prefs.notify_response_received;
    WHEN 'status_accepted' THEN
      v_should_notify := v_prefs.notify_status_accepted;
    WHEN 'status_rejected' THEN
      v_should_notify := v_prefs.notify_status_rejected;
    WHEN 'submission_reminder' THEN
      v_should_notify := v_prefs.notify_submission_reminder;
    ELSE
      v_should_notify := false;
  END CASE;

  -- Only create notification if enabled
  IF NOT v_should_notify OR NOT v_prefs.in_app_enabled THEN
    RETURN NULL;
  END IF;

  -- Determine if email should be sent
  v_send_email := v_prefs.email_enabled AND v_prefs.email_digest_frequency = 'immediate';

  -- Create the notification
  INSERT INTO submission_notifications (
    user_id,
    submission_id,
    partner_submission_id,
    type,
    title,
    message,
    metadata,
    sent_via_email,
    email_sent_at
  )
  VALUES (
    p_user_id,
    p_submission_id,
    p_partner_submission_id,
    p_type,
    p_title,
    p_message,
    p_metadata,
    v_send_email,
    CASE WHEN v_send_email THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * mark_notification_as_read
 *
 * Marks a notification as read by setting the read_at timestamp.
 */
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE submission_notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND read_at IS NULL
  RETURNING true INTO v_updated;

  RETURN COALESCE(v_updated, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * mark_all_notifications_as_read
 *
 * Marks all unread notifications for a user as read.
 */
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE submission_notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND read_at IS NULL
  RETURNING COUNT(*) INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * get_unread_notification_count
 *
 * Returns the count of unread notifications for a user.
 */
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM submission_notifications
  WHERE user_id = p_user_id
    AND read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

/**
 * Auto-update timestamp trigger for notification preferences
 */
CREATE TRIGGER update_submission_notification_preferences_updated_at
  BEFORE UPDATE ON submission_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Additional indexes for performance
CREATE INDEX idx_submission_notifications_user_unread
  ON submission_notifications(user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX idx_submission_notifications_submission
  ON submission_notifications(submission_id);

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON submission_notification_preferences TO authenticated;
GRANT SELECT, UPDATE ON submission_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION create_submission_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
