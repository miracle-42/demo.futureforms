# Stateless or Stateful

Futureforms can be setup to either run in a stateless or stateful
configuration.

## Pros & Cons

There is advantages and disadvantages.

## Stateful

In a stateful configuration there is these characteristics:

* A cursor keeps track of current position
  and this give less load on the database
* A transaction can be open and rolled back

Cons:
* Complex configuration
* Users need education

## Load balancing

Pros:
* Better web response
* Fault tolerant to web server down
* Upgrade without downtime

Cons:
* Complex configuration
* Require more resources on the server (RAM & CPU)
