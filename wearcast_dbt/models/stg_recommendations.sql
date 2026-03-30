with source as (
    select * from recommendations
),

staged as (
    select
        location,
        temperature,
        windspeed,
        weathercode,
        runs_cold,
        outfit,
        created_at,
        case
            when weathercode between 0 and 2 then 'clear'
            when weathercode = 3 then 'overcast'
            when weathercode between 61 and 67 then 'rain'
            when weathercode between 71 and 77 then 'snow'
            else 'other'
        end as weather_description
    from source
)

select * from staged