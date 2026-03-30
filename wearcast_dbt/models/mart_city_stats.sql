with base as (
    select * from {{ ref('stg_recommendations') }}
)

select
    location,
    count(*) as total_searches,
    round(avg(temperature), 1) as avg_temperature,
    round(avg(windspeed), 1) as avg_windspeed,
    sum(case when runs_cold then 1 else 0 end) as runs_cold_count,
    sum(case when not runs_cold then 1 else 0 end) as runs_warm_count,
    max(created_at) as last_searched_at
from base
group by location
order by total_searches desc
