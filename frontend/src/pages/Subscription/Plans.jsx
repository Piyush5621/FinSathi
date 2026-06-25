import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { subscriptionsApi } from '../../api/subscriptions';
import { PLANS } from '../../constants/plans';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

const Plans = () => {
  const { subscription, isLoading } = useSubscription();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlan = subscription?.plan || 'free';

  const handleUpgrade = async (planKey) => {
    if (planKey === 'free') return;
    setIsProcessing(true);
    try {
      const order = await subscriptionsApi.createOrder({ plan: planKey, billingCycle });
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: order.currency,
        name: "FinSathi",
        description: `Upgrade to ${PLANS[planKey].name} Plan`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            await subscriptionsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
              billingCycle
            });
            toast.success("Payment successful! Your plan has been upgraded.");
            window.location.reload();
          } catch (err) {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: "Business Owner", // We can pass actual user details if known
          email: "owner@example.com",
        },
        theme: {
          color: "#2483F5"
        }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (error) {
      const backendMsg = error.response?.data?.message;
      toast.error(backendMsg || "Failed to initiate checkout. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-gray-600">Scale your business with FinSathi's powerful tools.</p>
        
        <div className="mt-6 inline-flex bg-gray-100 rounded-lg p-1">
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly <span className="ml-1 text-xs text-green-600 font-bold">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.entries(PLANS).map(([key, plan]) => {
          const isCurrent = currentPlan === key;
          const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          
          return (
            <div key={key} className={`bg-white rounded-2xl shadow-sm border ${isCurrent ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-200'} p-8 relative flex flex-col`}>
              {isCurrent && (
                <div className="absolute top-0 right-8 transform -translate-y-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Current Plan
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold text-gray-900">
                  ₹{price}
                  {key !== 'free' && <span className="ml-1 text-lg font-medium text-gray-500">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>}
                </div>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                  {plan.limits.invoices_per_month === -1 ? 'Unlimited Invoices' : `${plan.limits.invoices_per_month} Invoices/month`}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                  {plan.limits.products === -1 ? 'Unlimited Products' : `${plan.limits.products} Products`}
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                  {plan.limits.businesses} Business(es)
                </li>
                {Object.entries(plan.features).map(([featureKey, isIncluded]) => (
                  <li key={featureKey} className={`flex items-center text-sm ${isIncluded ? 'text-gray-600' : 'text-gray-400'}`}>
                    {isIncluded ? (
                      <Check className="h-5 w-5 text-green-500 mr-3 shrink-0" />
                    ) : (
                      <X className="h-5 w-5 text-gray-300 mr-3 shrink-0" />
                    )}
                    <span className="capitalize">{featureKey.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(key)}
                disabled={isCurrent || (key === 'free') || isProcessing}
                className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : key === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isProcessing ? 'Processing...' : isCurrent ? 'Active' : key === 'free' ? 'Downgrade' : 'Upgrade Now'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
