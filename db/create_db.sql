create table rater (
  rater_uuid UUID primary key,
  rater_name varchar(30) not null
);

create table movie (
  movie_id serial primary key,
  movie_name varchar(90) not null
);

create table rating (
  rating_id serial primary key,
  rater_uuid uuid references rater(rater_uuid) not null,
  movie_id int references movie(movie_id) not null,
  rating_date timestamp,
  rating_plot int not null,
  rating_script int not null,
  rating_hotness int not null,
  rating_sound int not null,
  rating_visuality int not null,
  rating_characters int not null
);
