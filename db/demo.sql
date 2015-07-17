ALTER SEQUENCE movie_movie_id_seq RESTART WITH 1;

insert into rater (rater_uuid, rater_name) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'giffis');

insert into movie (movie_name) values ('Prometheus');
insert into movie (movie_name) values ('Blade Runner');

insert into rating (rater_uuid, movie_id, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, now(), 6, 1, 10, 8, 8, 1);

insert into rating (rater_uuid, movie_id, rating_date, rating_plot, rating_script, rating_hotness, rating_sound, rating_visuality, rating_characters) values ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, now(), 10, 10, 10, 10, 10, 10);
