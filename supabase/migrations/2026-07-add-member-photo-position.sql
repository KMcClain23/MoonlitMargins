-- Lets each member's avatar be repositioned/zoomed independently of the raw
-- uploaded photo, since a photo cropped well as a rectangle often needs a
-- different focal point once it's cropped to a small circle. zoom is a
-- multiplier (1 = fit, up to 3 = zoomed in); offset_x/offset_y are percentages
-- of the avatar's rendered size used to pan the zoomed image, independent of
-- whatever pixel size the avatar happens to be displayed at.

alter table members
  add column if not exists photo_zoom numeric not null default 1
  check (photo_zoom >= 1 and photo_zoom <= 3);

alter table members
  add column if not exists photo_offset_x numeric not null default 0
  check (photo_offset_x >= -50 and photo_offset_x <= 50);

alter table members
  add column if not exists photo_offset_y numeric not null default 0
  check (photo_offset_y >= -50 and photo_offset_y <= 50);
